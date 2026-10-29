import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, newOrganizer, newEvent, payEvent, futureDate } from './helpers.js';
import { guestToken } from '../src/util.js';
import { signWebhook } from '../src/integrations/whatsapp.js';
import { signPaymentWebhook } from '../src/integrations/payments.js';

let env;
before(async () => { env = await setup(); });
after(async () => { await env.pool.end(); });

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function stats(token, eventId) {
  return (await env.api.get(`/api/events/${eventId}`).set(auth(token))).body.stats;
}

async function messages(eventId) {
  const { rows } = await env.pool.query('SELECT m.*, g.phone FROM messages m JOIN guests g ON g.id = m.guest_id WHERE m.event_id = $1 ORDER BY m.created_at', [eventId]);
  return rows;
}


test('без согласия на обработку данных регистрация невозможна', async () => {
  const res = await env.api.post('/api/session').send({});
  assert.equal(res.status, 400);
});

test('создание мероприятия: название, дата, время, адрес, текст — одним запросом', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  assert.equal(event.title, 'Свадебный той');
  assert.equal(event.paymentStatus, 'unpaid');
  const bad = await env.api.post('/api/events').set(auth(token)).send({ title: '', event_date: 'x' });
  assert.equal(bad.status, 400);
  const past = await env.api.post('/api/events').set(auth(token)).send({
    title: 'a', event_date: '2020-01-01', event_time: '10:00', address: 'a', invitation_text: 'a' });
  assert.equal(past.status, 400);
});

test('можно добавить, выбрать и удалить гостей; номера нормализуются, дубли отсекаются', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  const res = await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Алия', phone: '8 701 234 56 78' },
    { name: 'Бауыржан', phone: '+7 (701) 987-65-43' },
    { name: 'Дубль Алии', phone: '+77012345678' },
    { name: 'Ошибка', phone: '123' },
  ] });
  assert.equal(res.status, 201);
  assert.equal(res.body.added.length, 2);
  assert.equal(res.body.added[0].phone, '+77012345678');
  assert.deepEqual(res.body.rejected.map((r) => r.reason), ['Уже в списке', 'Неверный номер']);

  const list = await env.api.get(`/api/events/${event.id}/guests`).set(auth(token));
  assert.equal(list.body.length, 2);
  const del = await env.api.delete(`/api/events/${event.id}/guests/${list.body[0].id}`).set(auth(token));
  assert.equal(del.status, 200);
  assert.equal((await stats(token, event.id)).total, 1);
});

test('чужой организатор не видит и не меняет мероприятие', async () => {
  const owner = await newOrganizer(env.api);
  const other = await newOrganizer(env.api);
  const event = await newEvent(env.api, owner);
  assert.equal((await env.api.get(`/api/events/${event.id}`).set(auth(other))).status, 404);
  assert.equal((await env.api.post(`/api/events/${event.id}/guests`).set(auth(other)).send({ guests: [{ name: 'x', phone: '+77010000000' }] })).status, 404);
});

test('оплата подтверждается только сервером по подписанному вебхуку', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);

  // Без оплаты рассылка запрещена.
  assert.equal((await env.api.post(`/api/events/${event.id}/send`).set(auth(token))).status, 402);

  const pay = await env.api.post(`/api/events/${event.id}/payments`).set(auth(token));
  assert.equal(pay.status, 201);
  assert.equal(pay.body.amountKzt, 1000);
  assert.equal((await env.api.get(`/api/events/${event.id}/payment`).set(auth(token))).body.paymentStatus, 'pending');

  // Поддельный вебхук без верной подписи отклоняется.
  const { rows } = await env.pool.query('SELECT provider_payment_id FROM payments WHERE id = $1', [pay.body.paymentId]);
  const forged = JSON.stringify({ event_id: 'evt_x', payment_id: rows[0].provider_payment_id, status: 'paid', amount: 1000, currency: 'KZT' });
  const r1 = await env.api.post('/webhooks/payments').set('x-signature', 'deadbeef').set('content-type', 'application/json').send(forged);
  assert.equal(r1.status, 401);
  assert.equal((await env.api.get(`/api/events/${event.id}/payment`).set(auth(token))).body.paymentStatus, 'pending');

  // Неверная сумма с верной подписью тоже не засчитывается.
  const cheap = JSON.stringify({ event_id: 'evt_cheap', payment_id: rows[0].provider_payment_id, status: 'paid', amount: 1, currency: 'KZT' });
  await env.api.post('/webhooks/payments').set('x-signature', signPaymentWebhook(env.config.payments.webhookSecret, cheap)).set('content-type', 'application/json').send(cheap);
  assert.equal((await env.api.get(`/api/events/${event.id}/payment`).set(auth(token))).body.paymentStatus, 'pending');

  // Оплата через эмулятор провайдера.
  await env.api.post(`/test/pay/${pay.body.paymentId}`).type('form').send({ result: 'paid' });
  assert.equal((await env.api.get(`/api/events/${event.id}/payment`).set(auth(token))).body.paymentStatus, 'paid');
  assert.equal((await env.api.post(`/api/events/${event.id}/payments`).set(auth(token))).status, 409);

  const { rows: logs } = await env.pool.query(`SELECT * FROM integration_logs WHERE integration = 'payments' AND level = 'error'`);
  assert.ok(logs.some((l) => l.message.includes('неверной подписью')));
  assert.ok(logs.some((l) => l.message.includes('Сумма оплаты не совпадает')));
  assert.ok(logs.every((l) => l.test_mode === true));
});

test('приглашения уходят один раз, гость отвечает по ссылке без приложения, статистика меняется', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Алия', phone: '+77011111111' }, { name: 'Ерлан', phone: '+77022222222' }, { name: 'Назым', phone: '+77033333333' },
  ] });
  await payEvent(env.api, token, event.id);

  const send1 = await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  assert.equal(send1.body.queued, 3);
  const send2 = await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  assert.equal(send2.body.queued, 0, 'повторное нажатие не дублирует приглашения');

  const outboxBefore = env.ctx.whatsapp.outbox.length;
  await env.ctx.messaging.processQueue();
  await env.ctx.messaging.processQueue();
  assert.equal(env.ctx.whatsapp.outbox.length - outboxBefore, 3);

  // Вебхук о доставке (приходит дважды — Meta повторяет доставку).
  const hook = env.ctx.whatsapp.takeStatusWebhook();
  const raw = JSON.stringify(hook);
  for (let i = 0; i < 2; i++) {
    const res = await env.api.post('/webhooks/whatsapp').set('x-hub-signature-256', signWebhook(env.config.whatsapp.appSecret, raw)).set('content-type', 'application/json').send(raw);
    assert.equal(res.status, 200);
  }
  assert.ok((await messages(event.id)).every((m) => m.status === 'delivered'));

  // Гость открывает ссылку в браузере и отвечает.
  const guests = (await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body;
  const alia = guests.find((g) => g.name === 'Алия');
  const erlan = guests.find((g) => g.name === 'Ерлан');
  const page = await env.api.get(`/r/${guestToken(env.config.linkSecret, alia.id)}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Приду/);
  assert.match(page.text, /Не смогу прийти/);
  assert.doesNotMatch(page.text, /Ерлан/, 'гость не видит других гостей');

  await env.api.post(`/r/${guestToken(env.config.linkSecret, alia.id)}`).type('form').send({ answer: 'yes' }).expect(303);
  await env.api.post(`/r/${guestToken(env.config.linkSecret, erlan.id)}`).type('form').send({ answer: 'no' }).expect(303);
  assert.deepEqual(await stats(token, event.id), { total: 3, yes: 1, no: 1, pending: 1 });

  // Организатор получил уведомления.
  const notes = (await env.api.get('/api/notifications').set(auth(token))).body.map((n) => n.text);
  assert.ok(notes.includes('Алия придёт на «Свадебный той»'));
  assert.ok(notes.includes('Ерлан не сможет прийти на «Свадебный той»'));

  // Гость может передумать.
  await env.api.post(`/r/${guestToken(env.config.linkSecret, erlan.id)}`).type('form').send({ answer: 'yes' });
  assert.deepEqual(await stats(token, event.id), { total: 3, yes: 2, no: 0, pending: 1 });
});

test('поддельная или чужая ссылка гостя не работает', async () => {
  const res = await env.api.get('/r/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  assert.equal(res.status, 404);
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  const g = (await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77019999999' }] })).body.added[0];
  const real = guestToken(env.config.linkSecret, g.id);
  const tampered = real.slice(0, -2) + (real.endsWith('A') ? 'BB' : 'AA');
  assert.equal((await env.api.get(`/r/${tampered}`)).status, 404);
  assert.equal((await env.api.get(`/r/${guestToken('other-secret', g.id)}`)).status, 404);
});

// Момент «за N дней до тоя, в hh:mm по Астане».
function at(event, days, hhmm = '09:00') {
  const [y, m, d] = event.eventDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
  return new Date(`${date}T${hhmm}:00+05:00`);
}

// Запускает планировщик на момент now и возвращает, сколько напоминаний создано для этого мероприятия
// (в общей тестовой базе есть и мероприятия других тестов).
async function schedule(event, now) {
  const count = async () => (await messages(event.id)).filter((m) => m.kind !== 'invite').length;
  const was = await count();
  await env.ctx.messaging.scheduleReminders(now);
  return (await count()) - was;
}

test('напоминания за 10, 3 и 1 день в 9:00 по Астане: «Приду» и не ответившим; без повторов; с учётом отказа', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token, { first_reminder_days: 10 });
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Придёт', phone: '+77041111111' },
    { name: 'Молчит', phone: '+77042222222' },
    { name: 'Не придёт', phone: '+77045555555' },
    { name: 'Отписался', phone: '+77043333333' },
    { name: 'СТОП в WhatsApp', phone: '+77044444444' },
  ] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  while (await env.ctx.messaging.processQueue(500));

  const guests = (await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body;
  const byName = Object.fromEntries(guests.map((g) => [g.name, g]));
  await env.api.post(`/r/${guestToken(env.config.linkSecret, byName['Придёт'].id)}`).type('form').send({ answer: 'yes' });
  await env.api.post(`/r/${guestToken(env.config.linkSecret, byName['Не придёт'].id)}`).type('form').send({ answer: 'no' });
  await env.api.post(`/r/${guestToken(env.config.linkSecret, byName['Отписался'].id)}/optout`);
  // Отказ через входящее сообщение «СТОП» в WhatsApp.
  await env.ctx.messaging.handleWebhook(env.ctx.whatsapp.inboundTextWebhook('+77044444444', 'СТОП'));

  // До первого напоминания ничего не создаётся, в том числе за минуту до 9:00.
  assert.equal(await schedule(event), 0);
  assert.equal(await schedule(event, at(event, 10, '08:59')), 0);

  // За 10 дней, 9:00 по Астане (04:00 UTC).
  assert.equal(at(event, 10).toISOString().slice(11, 16), '04:00');
  assert.equal(await schedule(event, at(event, 10)), 2);
  assert.equal(await schedule(event, at(event, 10, '15:00')), 0, 'повторный запуск планировщика не дублирует');
  const before = env.ctx.whatsapp.outbox.length;
  while (await env.ctx.messaging.processQueue(500));
  const sent = env.ctx.whatsapp.outbox.slice(before).filter((m) => m.to.startsWith('+7704'));
  const byPhone = Object.fromEntries(sent.map((m) => [m.to, m]));
  assert.deepEqual(Object.keys(byPhone).sort(), ['+77041111111', '+77042222222']);
  assert.equal(byPhone['+77041111111'].template, 'toytime_reminder_yes', 'ответившему «Приду» — напоминание «ждём вас»');
  assert.equal(byPhone['+77042222222'].template, 'toytime_reminder');

  // За 3 дня: «Молчит» отвечает «Не смогу» после постановки в очередь, но до отправки.
  assert.equal(await schedule(event, at(event, 3)), 2);
  await env.api.post(`/r/${guestToken(env.config.linkSecret, byName['Молчит'].id)}`).type('form').send({ answer: 'no' });
  const before2 = env.ctx.whatsapp.outbox.length;
  while (await env.ctx.messaging.processQueue(500));
  assert.deepEqual(env.ctx.whatsapp.outbox.slice(before2).filter((m) => m.to.startsWith('+7704')).map((m) => m.to), ['+77041111111'],
    'отказавшемуся напоминание не уходит');

  // За 1 день: только «Придёт».
  assert.equal(await schedule(event, at(event, 1)), 1);
  while (await env.ctx.messaging.processQueue(500));

  const all = await messages(event.id);
  const reminders = all.filter((m) => m.kind !== 'invite' && m.status === 'sent');
  assert.deepEqual(reminders.map((m) => `${m.phone} ${m.kind}`).sort(), [
    '+77041111111 reminder_1d', '+77041111111 reminder_3d', '+77041111111 reminder_first', '+77042222222 reminder_first',
  ]);
});

test('если сервер простаивал, уходит только последнее из пропущенных напоминаний', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77051111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  await env.ctx.messaging.processQueue();
  assert.equal(await schedule(event, at(event, 2, '12:00')), 1);
  const kinds = (await messages(event.id)).map((m) => m.kind);
  assert.deepEqual(kinds, ['invite', 'reminder_3d']);
});

test('повторные попытки при временной ошибке, без повтора при неизвестном исходе', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Временная', phone: '+77060000001' },
    { name: 'Постоянная', phone: '+77060000002' },
    { name: 'Таймаут', phone: '+77060000003' },
  ] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));

  for (let i = 0; i < 7; i++) {
    await env.ctx.messaging.processQueue();
    await env.pool.query(`UPDATE messages SET next_attempt_at = now() WHERE event_id = $1 AND status = 'queued'`, [event.id]);
  }
  const byPhone = Object.fromEntries((await messages(event.id)).map((m) => [m.phone, m]));
  assert.equal(byPhone['+77060000001'].status, 'failed');
  assert.equal(byPhone['+77060000001'].attempts, env.config.whatsapp.maxAttempts);
  assert.equal(byPhone['+77060000002'].status, 'failed');
  assert.equal(byPhone['+77060000002'].attempts, 1, 'постоянная ошибка не повторяется');
  assert.equal(byPhone['+77060000003'].status, 'unknown');
  assert.equal(byPhone['+77060000003'].attempts, 1, 'неизвестный исход не повторяется, чтобы не было дубля');

  const { rows } = await env.pool.query(`SELECT count(*)::int AS n FROM integration_logs WHERE integration = 'whatsapp' AND level = 'error'`);
  assert.ok(rows[0].n >= 7);
  const notes = (await env.api.get('/api/notifications').set(auth(token))).body.map((n) => n.text);
  assert.ok(notes.some((t) => t.includes('Постоянная')));
});

test('зависшая отправка не повторяется автоматически', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77071111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  await env.pool.query(`UPDATE messages SET status = 'sending', locked_at = now() - interval '1 hour' WHERE event_id = $1`, [event.id]);
  assert.equal(await env.ctx.messaging.recoverStale(), 1);
  assert.equal((await messages(event.id))[0].status, 'unknown');
  assert.equal(await env.ctx.messaging.processQueue(), 0);
});

test('вебхук WhatsApp: проверка подписи, верификация, статусы не понижаются', async () => {
  const bad = await env.api.post('/webhooks/whatsapp').set('x-hub-signature-256', 'sha256=00').send({ entry: [] });
  assert.equal(bad.status, 401);
  const verify = await env.api.get('/webhooks/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': env.config.whatsapp.verifyToken, 'hub.challenge': '42' });
  assert.equal(verify.text, '42');

  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77081111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  await env.ctx.messaging.processQueue();
  env.ctx.whatsapp.takeStatusWebhook();
  const [msg] = await messages(event.id);
  const wh = (status) => ({ entry: [{ changes: [{ value: { statuses: [{ id: msg.provider_message_id, status }] } }] }] });
  await env.ctx.messaging.handleWebhook(wh('read'));
  await env.ctx.messaging.handleWebhook(wh('delivered'));
  assert.equal((await messages(event.id))[0].status, 'read');
});

test('гости, добавленные после рассылки, получают приглашение автоматически', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77091111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'Б', phone: '+77092222222' }] });
  assert.equal((await messages(event.id)).length, 2);
});

test('отзыв согласия удаляет все данные организатора', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'А', phone: '+77001234567' }] });
  const exp = await env.api.get('/api/me/export').set(auth(token));
  assert.equal(exp.body.guests.length, 1);
  assert.equal((await env.api.delete('/api/me').set(auth(token))).status, 200);
  assert.equal((await env.api.get('/api/me').set(auth(token))).status, 401);
  const { rowCount } = await env.pool.query('SELECT 1 FROM events WHERE id = $1', [event.id]);
  assert.equal(rowCount, 0);
  const { rowCount: g } = await env.pool.query(`SELECT 1 FROM guests WHERE phone = '+77001234567'`);
  assert.equal(g, 0);
});

test('сценарий организатора укладывается в 3 минуты: 6 запросов к API', async () => {
  // Весь путь: сессия → мероприятие → гости → оплата → подтверждение → рассылка.
  const t0 = Date.now();
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token, { event_date: futureDate(20) });
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({
    guests: Array.from({ length: 300 }, (_, i) => ({ name: `Гость ${i}`, phone: `+7701${String(5000000 + i)}` })),
  });
  await payEvent(env.api, token, event.id);
  const sent = await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  assert.equal(sent.body.queued, 300);
  assert.ok(Date.now() - t0 < 10_000, 'серверная часть сценария занимает секунды');
});

test('журнал ошибок доступен только с токеном администратора', async () => {
  assert.equal((await env.api.get('/admin/logs')).status, 401);
  const res = await env.api.get('/admin/logs').set('Authorization', `Bearer ${env.config.adminToken}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('страница гостя: календарь .ics и оформление', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token);
  const g = (await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'Айжан', phone: '+77015550000' }] })).body.added[0];
  const t = guestToken(env.config.linkSecret, g.id);
  const page = await env.api.get(`/r/${t}`);
  assert.match(page.text, /Құрметті Айжан/);
  assert.match(page.text, /2gis\.kz/);
  const ics = await env.api.get(`/r/${t}/calendar.ics`);
  assert.equal(ics.status, 200);
  assert.match(ics.headers['content-type'], /text\/calendar/);
  assert.match(ics.text, /SUMMARY:Свадебный той/);
  assert.match(ics.text, /DTSTART:\d{8}T140000Z/);
});

test('макет заказчика: подпись хозяина, выбор получателей, ручной статус, выключение напоминаний', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token, { host_name: 'Семья Ерлановых', first_reminder_days: 10 });
  assert.equal(event.hostName, 'Семья Ерлановых');
  assert.equal(event.remindersEnabled, true);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Данияр', phone: '+77051111111' }, { name: 'Алия', phone: '+77052222222' }, { name: 'Айгерим', phone: '+77053333333' },
  ] });
  const byName = Object.fromEntries((await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body.map((g) => [g.name, g]));
  assert.equal(byName['Данияр'].selected, true, 'новые гости выбраны по умолчанию');

  // Айгерим не выбрана — приглашение ей не уходит.
  await env.api.patch(`/api/events/${event.id}/guests/${byName['Айгерим'].id}`).set(auth(token)).send({ selected: false });
  // Алия ответила организатору по телефону — он ставит статус вручную.
  const manual = await env.api.patch(`/api/events/${event.id}/guests/${byName['Алия'].id}`).set(auth(token)).send({ rsvp: 'yes' });
  assert.equal(manual.body.rsvp, 'yes');
  assert.equal((await env.api.patch(`/api/events/${event.id}/guests/${byName['Алия'].id}`).set(auth(token)).send({ rsvp: 'maybe' })).status, 400);
  assert.equal((await stats(token, event.id)).yes, 1);

  // Снять выбор со всех — отправлять некому.
  await env.api.post(`/api/events/${event.id}/guests/select`).set(auth(token)).send({ selected: false });
  await payEvent(env.api, token, event.id);
  assert.equal((await env.api.post(`/api/events/${event.id}/send`).set(auth(token))).status, 400);
  await env.api.post(`/api/events/${event.id}/guests/select`).set(auth(token)).send({ selected: true });
  await env.api.patch(`/api/events/${event.id}/guests/${byName['Айгерим'].id}`).set(auth(token)).send({ selected: false });

  const before = env.ctx.whatsapp.outbox.length;
  const sent = await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  assert.equal(sent.body.queued, 2);
  while (await env.ctx.messaging.processQueue(500));
  const out = env.ctx.whatsapp.outbox.slice(before).filter((m) => m.to.startsWith('+7705'));
  assert.deepEqual(out.map((m) => m.to).sort(), ['+77051111111', '+77052222222']);
  assert.match(out[0].preview, /Семья Ерлановых приглашает вас/);

  // Ссылка на страницу гостя для предпросмотра.
  const link = await env.api.get(`/api/events/${event.id}/guests/${byName['Данияр'].id}/link`).set(auth(token));
  assert.match(link.body.url, /^http:\/\/test\.local\/r\//);
  const page = await env.api.get(new URL(link.body.url).pathname);
  assert.match(page.text, /Семья Ерлановых приглашает вас/);

  // Напоминания выключены — не создаются, даже когда наступил срок.
  await env.api.patch(`/api/events/${event.id}`).set(auth(token)).send({ reminders_enabled: false });
  assert.equal(await schedule(event, at(event, 9)), 0);
  await env.api.patch(`/api/events/${event.id}`).set(auth(token)).send({ reminders_enabled: true });
  assert.equal(await schedule(event, at(event, 9)), 2, 'Данияр и Алия («Приду»), Айгерим не приглашена');
});

test('доп. ТЗ: телефон хозяина, фото/видео-приглашение всем гостям, приглашение на казахском', async () => {
  const token = await newOrganizer(env.api);
  // Телефон хозяина обязателен и нормализуется.
  assert.equal((await env.api.post('/api/events').set(auth(token)).send({
    title: 'Той', event_date: futureDate(20), event_time: '18:00', address: 'Алматы', invitation_text: 'Келіңіз!',
  })).status, 400);
  const event = await newEvent(env.api, token, { host_phone: '8 (701) 555-44-33', lang: 'kk', host_name: 'Ерлановтар отбасы' });
  assert.equal(event.hostPhone, '+77015554433');
  assert.equal(event.lang, 'kk');
  assert.equal(event.media, null);

  // Неподходящий формат и пустой файл отклоняются.
  assert.equal((await env.api.put(`/api/events/${event.id}/media`).set(auth(token)).set('Content-Type', 'image/gif').send(Buffer.from('GIF89a'))).status, 415);
  // Фото загружается и доступно по подписанной ссылке.
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
  const up = await env.api.put(`/api/events/${event.id}/media`).set(auth(token)).set('Content-Type', 'image/jpeg').send(jpeg);
  assert.equal(up.status, 200);
  assert.equal(up.body.media.type, 'image');
  const mediaPath = new URL(up.body.media.url).pathname;
  const file = await env.api.get(mediaPath).buffer(true);
  assert.equal(file.status, 200);
  assert.equal(file.headers['content-type'], 'image/jpeg');
  assert.equal(file.body.length, jpeg.length);
  const part = await env.api.get(mediaPath).set('Range', 'bytes=0-3').buffer(true);
  assert.equal(part.status, 206);
  assert.equal(part.body.length, 4);
  assert.equal((await env.api.get(mediaPath.slice(0, -3) + 'abc')).status, 404, 'подделанная ссылка не работает');

  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'Данияр', phone: '+77061111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  // Гость, добавленный после рассылки, тоже получает приглашение с фото.
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'Алия', phone: '+77062222222' }] });
  const before = env.ctx.whatsapp.outbox.length;
  while (await env.ctx.messaging.processQueue(500));
  const out = env.ctx.whatsapp.outbox.slice(before).filter((m) => m.to.startsWith('+7706'));
  assert.equal(out.length, 2);
  for (const m of out) {
    assert.equal(m.template, 'toytime_invite_image');
    assert.equal(m.language, 'kk');
    assert.equal(m.header.type, 'image');
    assert.equal(new URL(m.header.link).pathname, mediaPath);
    assert.match(m.preview, /Ерлановтар отбасы сізді мерекеге шақырады/);
    assert.match(m.preview, /\+7 701 555 44 33/);
  }

  // Страница гостя на казахском, с фото и телефоном хозяина.
  const guests = (await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body;
  const page = await env.api.get(`/r/${guestToken(env.config.linkSecret, guests[0].id)}`);
  assert.match(page.text, /<html lang="kk">/);
  assert.match(page.text, /Барамын/);
  assert.match(page.text, /tel:\+77015554433/);
  assert.ok(page.text.includes(mediaPath));

  // Замена на видео: старая ссылка больше не работает. Удаление файла.
  await new Promise((r) => setTimeout(r, 5));
  const vid = await env.api.put(`/api/events/${event.id}/media`).set(auth(token)).set('Content-Type', 'video/mp4').send(Buffer.alloc(3000, 1));
  assert.equal(vid.body.media.type, 'video');
  assert.equal((await env.api.get(mediaPath)).status, 404);
  assert.equal((await env.api.delete(`/api/events/${event.id}/media`).set(auth(token))).status, 200);
  assert.equal((await env.api.get(`/api/events/${event.id}`).set(auth(token))).body.media, null);
});

test('приглашение на английском: шаблон, дата и страница гостя', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token, { lang: 'en', host_name: 'The Yerlanovs', event_date: '2027-03-14' });
  assert.equal(event.lang, 'en');
  assert.equal((await env.api.patch(`/api/events/${event.id}`).set(auth(token)).send({ lang: 'de' })).status, 400);
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [{ name: 'Daniyar', phone: '+77071111111' }] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  const before = env.ctx.whatsapp.outbox.length;
  while (await env.ctx.messaging.processQueue(500));
  const [msg] = env.ctx.whatsapp.outbox.slice(before).filter((m) => m.to === '+77071111111');
  assert.equal(msg.language, 'en');
  assert.match(msg.preview, /The Yerlanovs invites you to “Свадебный той”/);
  assert.match(msg.preview, /Date: 14 March 2027/);
  const guests = (await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body;
  const page = await env.api.get(`/r/${guestToken(env.config.linkSecret, guests[0].id)}`);
  assert.match(page.text, /<html lang="en">/);
  assert.match(page.text, /Dear Daniyar!/);
  assert.match(page.text, /Sunday/);
});

test('тестовый режим: напоминание можно отправить сразу со страницы эмулятора', async () => {
  const token = await newOrganizer(env.api);
  const event = await newEvent(env.api, token, { title: 'Тест напоминаний' });
  await env.api.post(`/api/events/${event.id}/guests`).set(auth(token)).send({ guests: [
    { name: 'Придёт', phone: '+77081111111' }, { name: 'Молчит', phone: '+77082222222' }, { name: 'Не придёт', phone: '+77083333333' },
  ] });
  await payEvent(env.api, token, event.id);
  await env.api.post(`/api/events/${event.id}/send`).set(auth(token));
  while (await env.ctx.messaging.processQueue(500));
  const guests = Object.fromEntries((await env.api.get(`/api/events/${event.id}/guests`).set(auth(token))).body.map((g) => [g.name, g]));
  await env.api.post(`/r/${guestToken(env.config.linkSecret, guests['Придёт'].id)}`).type('form').send({ answer: 'yes' });
  await env.api.post(`/r/${guestToken(env.config.linkSecret, guests['Не придёт'].id)}`).type('form').send({ answer: 'no' });

  assert.equal((await env.api.post('/test/reminders').type('form').send({ event_id: event.id, kind: 'reminder_1d' })).status, 401);
  const page = await env.api.get('/test/whatsapp?token=dev-admin');
  assert.match(page.text, /Тест напоминаний/);
  const before = env.ctx.whatsapp.outbox.length;
  const res = await env.api.post('/test/reminders?token=dev-admin').type('form').send({ event_id: event.id, kind: 'reminder_1d' });
  assert.equal(res.status, 303);
  assert.match(res.headers.location, /done=2/);
  const sent = env.ctx.whatsapp.outbox.slice(before).map((m) => m.to).sort();
  assert.deepEqual(sent, ['+77081111111', '+77082222222']);
});
