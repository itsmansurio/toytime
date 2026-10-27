import express from 'express';
import { HttpError, normalizePhone, parseGuestToken, phoneHash, randomToken, sha256 } from './util.js';
import { verifyWebhookSignature } from './integrations/whatsapp.js';
import { verifyPaymentWebhook } from './integrations/payments.js';
import { notFoundPage, outboxPage, privacyPage, rsvpPage, testCheckoutPage } from './views/pages.js';

const asyncRoute = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Простое ограничение частоты запросов по IP (в памяти одного процесса).
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10000) hits.clear();
      return next();
    }
    if (++entry.count > max) return res.status(429).json({ error: 'Слишком много запросов, попробуйте позже' });
    next();
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateEvent(body, config, { partial = false } = {}) {
  const out = {};
  const str = (key, max) => {
    if (body[key] === undefined) {
      if (partial) return;
      throw new HttpError(400, `Поле ${key} обязательно`);
    }
    const value = String(body[key]).trim();
    if (!value) throw new HttpError(400, `Поле ${key} не может быть пустым`);
    if (value.length > max) throw new HttpError(400, `Поле ${key} длиннее ${max} символов`);
    out[key] = value;
  };
  str('title', 50);
  str('address', 200);
  str('invitation_text', 1000);
  if (body.event_date !== undefined || !partial) {
    if (!DATE_RE.test(body.event_date ?? '') || Number.isNaN(Date.parse(body.event_date))) throw new HttpError(400, 'Дата в формате ГГГГ-ММ-ДД');
    out.event_date = body.event_date;
  }
  if (body.event_time !== undefined || !partial) {
    if (!TIME_RE.test(body.event_time ?? '')) throw new HttpError(400, 'Время в формате ЧЧ:ММ');
    out.event_time = body.event_time;
  }
  if (body.first_reminder_days !== undefined) {
    if (![7, 10].includes(Number(body.first_reminder_days))) throw new HttpError(400, 'Первое напоминание: за 7 или 10 дней');
    out.first_reminder_days = Number(body.first_reminder_days);
  }
  return out;
}

export function createApp(ctx) {
  const { pool, config, messaging, whatsapp, payments, log, notify } = ctx;
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const keepRaw = (req, res, buf) => { req.rawBody = buf; };
  app.use(express.json({ limit: '1mb', verify: keepRaw }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // CORS нужен только для веб-предпросмотра приложения; мобильному приложению он не нужен.
  if (config.corsOrigin) {
    app.use('/api', (req, res, next) => {
      res.set({
        'Access-Control-Allow-Origin': config.corsOrigin,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
      });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/privacy', (req, res) => res.type('html').send(privacyPage()));

  // ---------- Организатор ----------

  const auth = asyncRoute(async (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /, '');
    if (!token) throw new HttpError(401, 'Нужна авторизация');
    const { rows } = await pool.query('SELECT * FROM organizers WHERE token_hash = $1', [sha256(token)]);
    if (!rows[0]) throw new HttpError(401, 'Сессия недействительна');
    req.organizer = rows[0];
    next();
  });

  async function loadEvent(req) {
    const { rows } = await pool.query('SELECT * FROM events WHERE id = $1 AND organizer_id = $2', [req.params.id, req.organizer.id]);
    if (!rows[0]) throw new HttpError(404, 'Мероприятие не найдено');
    return rows[0];
  }

  app.get('/api/config', (req, res) => {
    res.json({
      priceKzt: config.priceKzt,
      consentVersion: config.consentVersion,
      privacyUrl: `${config.publicUrl}/privacy`,
      testMode: { whatsapp: whatsapp.testMode, payments: payments.testMode },
    });
  });

  // Регистрация устройства. Без согласия на обработку персональных данных — нельзя.
  app.post('/api/session', rateLimit({ windowMs: 60_000, max: 20 }), asyncRoute(async (req, res) => {
    if (req.body?.consent !== true) throw new HttpError(400, 'Нужно согласие на обработку персональных данных');
    const token = randomToken();
    const { rows } = await pool.query(
      'INSERT INTO organizers (token_hash, name, consent_at, consent_version) VALUES ($1, $2, now(), $3) RETURNING id',
      [sha256(token), req.body.name ? String(req.body.name).slice(0, 100) : null, config.consentVersion],
    );
    res.status(201).json({ token, organizerId: rows[0].id });
  }));

  app.get('/api/me', auth, (req, res) => {
    const { id, name, consent_at, consent_version } = req.organizer;
    res.json({ id, name, consentAt: consent_at, consentVersion: consent_version });
  });

  app.patch('/api/me', auth, asyncRoute(async (req, res) => {
    const name = req.body.name !== undefined ? String(req.body.name).slice(0, 100) : req.organizer.name;
    const push = req.body.pushToken !== undefined ? (req.body.pushToken ? String(req.body.pushToken).slice(0, 200) : null) : req.organizer.push_token;
    await pool.query('UPDATE organizers SET name = $2, push_token = $3 WHERE id = $1', [req.organizer.id, name, push]);
    res.json({ ok: true });
  }));

  // Выгрузка всех данных организатора.
  app.get('/api/me/export', auth, asyncRoute(async (req, res) => {
    const { rows: events } = await pool.query('SELECT * FROM events WHERE organizer_id = $1', [req.organizer.id]);
    const { rows: guests } = await pool.query('SELECT g.* FROM guests g JOIN events e ON e.id = g.event_id WHERE e.organizer_id = $1', [req.organizer.id]);
    res.json({ organizer: { name: req.organizer.name, consentAt: req.organizer.consent_at }, events, guests });
  }));

  // Отзыв согласия: удаляем организатора и каскадом все мероприятия, гостей и сообщения.
  app.delete('/api/me', auth, asyncRoute(async (req, res) => {
    await pool.query('DELETE FROM organizers WHERE id = $1', [req.organizer.id]);
    res.json({ deleted: true });
  }));

  const STATS_SQL = `
    SELECT e.*,
      (SELECT count(*) FROM guests g WHERE g.event_id = e.id)::int AS guests_total,
      (SELECT count(*) FROM guests g WHERE g.event_id = e.id AND g.rsvp = 'yes')::int AS guests_yes,
      (SELECT count(*) FROM guests g WHERE g.event_id = e.id AND g.rsvp = 'no')::int AS guests_no,
      (SELECT count(*) FROM guests g WHERE g.event_id = e.id AND g.rsvp = 'pending')::int AS guests_pending
    FROM events e`;

  function eventJson(e) {
    return {
      id: e.id, title: e.title, eventDate: e.event_date, eventTime: e.event_time, startsAt: e.starts_at,
      address: e.address, invitationText: e.invitation_text, firstReminderDays: e.first_reminder_days,
      paymentStatus: e.payment_status, invitesSentAt: e.invites_sent_at,
      stats: e.guests_total === undefined ? undefined : { total: e.guests_total, yes: e.guests_yes, no: e.guests_no, pending: e.guests_pending },
    };
  }

  app.get('/api/events', auth, asyncRoute(async (req, res) => {
    const { rows } = await pool.query(`${STATS_SQL} WHERE e.organizer_id = $1 ORDER BY e.starts_at`, [req.organizer.id]);
    res.json(rows.map(eventJson));
  }));

  app.post('/api/events', auth, asyncRoute(async (req, res) => {
    const data = validateEvent(req.body, config);
    const startsAt = new Date(`${data.event_date}T${data.event_time}:00${config.utcOffset}`);
    if (startsAt <= new Date()) throw new HttpError(400, 'Дата мероприятия должна быть в будущем');
    const { rows } = await pool.query(
      `INSERT INTO events (organizer_id, title, event_date, event_time, starts_at, address, invitation_text, first_reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.organizer.id, data.title, data.event_date, data.event_time, startsAt, data.address, data.invitation_text, data.first_reminder_days ?? 7],
    );
    res.status(201).json(eventJson(rows[0]));
  }));

  app.get('/api/events/:id', auth, asyncRoute(async (req, res) => {
    await loadEvent(req);
    const { rows } = await pool.query(`${STATS_SQL} WHERE e.id = $1`, [req.params.id]);
    const { rows: reminders } = await pool.query(
      `SELECT kind, status, count(*)::int AS n FROM messages WHERE event_id = $1 GROUP BY kind, status`, [req.params.id]);
    res.json({ ...eventJson(rows[0]), messages: reminders });
  }));

  app.patch('/api/events/:id', auth, asyncRoute(async (req, res) => {
    const event = await loadEvent(req);
    const data = { ...event, ...validateEvent(req.body, config, { partial: true }) };
    const startsAt = new Date(`${data.event_date}T${data.event_time}:00${config.utcOffset}`);
    const { rows } = await pool.query(
      `UPDATE events SET title = $2, event_date = $3, event_time = $4, starts_at = $5, address = $6, invitation_text = $7, first_reminder_days = $8
       WHERE id = $1 RETURNING *`,
      [event.id, data.title, data.event_date, data.event_time, startsAt, data.address, data.invitation_text, data.first_reminder_days],
    );
    res.json(eventJson(rows[0]));
  }));

  app.delete('/api/events/:id', auth, asyncRoute(async (req, res) => {
    await loadEvent(req);
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  }));

  // ---------- Гости ----------

  app.get('/api/events/:id/guests', auth, asyncRoute(async (req, res) => {
    await loadEvent(req);
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.phone, g.rsvp, g.responded_at,
         (SELECT m.status FROM messages m WHERE m.guest_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_status
       FROM guests g WHERE g.event_id = $1 ORDER BY g.name`,
      [req.params.id],
    );
    res.json(rows.map((g) => ({ id: g.id, name: g.name, phone: g.phone, rsvp: g.rsvp, respondedAt: g.responded_at, messageStatus: g.last_message_status })));
  }));

  // Принимает только выбранных организатором гостей (имя + номер), не всю книгу контактов.
  app.post('/api/events/:id/guests', auth, asyncRoute(async (req, res) => {
    const event = await loadEvent(req);
    const list = Array.isArray(req.body.guests) ? req.body.guests : [];
    if (!list.length || list.length > 2000) throw new HttpError(400, 'Передайте от 1 до 2000 гостей');
    const added = [];
    const rejected = [];
    for (const item of list) {
      const phone = normalizePhone(item?.phone);
      const name = String(item?.name ?? '').trim().slice(0, 100) || phone;
      if (!phone) { rejected.push({ name: item?.name, phone: item?.phone, reason: 'Неверный номер' }); continue; }
      const { rows } = await pool.query(
        `INSERT INTO guests (event_id, name, phone) VALUES ($1, $2, $3) ON CONFLICT (event_id, phone) DO NOTHING RETURNING id, name, phone, rsvp`,
        [event.id, name, phone],
      );
      if (rows[0]) added.push(rows[0]); else rejected.push({ name, phone, reason: 'Уже в списке' });
    }
    // Если приглашения уже рассылались, новым гостям они уйдут автоматически.
    if (event.invites_sent_at && event.payment_status === 'paid' && added.length) await messaging.enqueueInvites(event.id);
    res.status(201).json({ added, rejected });
  }));

  app.delete('/api/events/:id/guests/:guestId', auth, asyncRoute(async (req, res) => {
    await loadEvent(req);
    const { rowCount } = await pool.query('DELETE FROM guests WHERE id = $1 AND event_id = $2', [req.params.guestId, req.params.id]);
    if (!rowCount) throw new HttpError(404, 'Гость не найден');
    res.json({ deleted: true });
  }));

  // ---------- Оплата ----------

  app.post('/api/events/:id/payments', auth, asyncRoute(async (req, res) => {
    const event = await loadEvent(req);
    if (event.payment_status === 'paid') throw new HttpError(409, 'Мероприятие уже оплачено');
    const { rows } = await pool.query(
      'INSERT INTO payments (event_id, provider, amount_kzt) VALUES ($1, $2, $3) RETURNING *',
      [event.id, payments.name, config.priceKzt],
    );
    const payment = rows[0];
    try {
      const created = await payments.createPayment({ paymentId: payment.id, amountKzt: config.priceKzt, description: `ToyTime: ${event.title}` });
      await pool.query('UPDATE payments SET provider_payment_id = $2 WHERE id = $1', [payment.id, created.providerPaymentId]);
      await pool.query(`UPDATE events SET payment_status = 'pending' WHERE id = $1 AND payment_status = 'unpaid'`, [event.id]);
      await log.info('payments', payments.testMode, `Создан платёж ${payment.id}`, { eventId: event.id, amount: config.priceKzt });
      res.status(201).json({ paymentId: payment.id, checkoutUrl: created.checkoutUrl, amountKzt: config.priceKzt, testMode: payments.testMode });
    } catch (err) {
      await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      await log.error('payments', payments.testMode, `Не удалось создать платёж: ${err.message}`, { paymentId: payment.id });
      throw new HttpError(502, 'Платёжный провайдер недоступен, попробуйте позже');
    }
  }));

  app.get('/api/events/:id/payment', auth, asyncRoute(async (req, res) => {
    const event = await loadEvent(req);
    res.json({ paymentStatus: event.payment_status, amountKzt: config.priceKzt, testMode: payments.testMode });
  }));

  async function handlePaymentWebhook(rawBody, signature) {
    if (!verifyPaymentWebhook(config.payments.webhookSecret, rawBody, signature)) {
      await log.error('payments', payments.testMode, 'Вебхук оплаты с неверной подписью отклонён');
      throw new HttpError(401, 'Неверная подпись');
    }
    const body = JSON.parse(rawBody.toString('utf8'));
    if (!(await messaging.firstSeen('payments', String(body.event_id)))) return;
    const { rows } = await pool.query(
      'SELECT p.*, e.organizer_id, e.title FROM payments p JOIN events e ON e.id = p.event_id WHERE p.provider_payment_id = $1',
      [body.payment_id],
    );
    const payment = rows[0];
    if (!payment) {
      await log.error('payments', payments.testMode, 'Вебхук для неизвестного платежа', { providerPaymentId: body.payment_id });
      return;
    }
    if (body.status === 'paid') {
      if (Number(body.amount) !== payment.amount_kzt || body.currency !== 'KZT') {
        await log.error('payments', payments.testMode, 'Сумма оплаты не совпадает', { paymentId: payment.id, amount: body.amount, currency: body.currency });
        return;
      }
      await pool.query(`UPDATE payments SET status = 'paid', confirmed_at = now() WHERE id = $1`, [payment.id]);
      await pool.query(`UPDATE events SET payment_status = 'paid' WHERE id = $1`, [payment.event_id]);
      await log.info('payments', payments.testMode, `Оплата подтверждена ${payment.id}`);
      await notify(payment.organizer_id, payment.event_id, `Оплата за «${payment.title}» подтверждена`);
    } else if (body.status === 'failed') {
      await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [payment.id]);
      await pool.query(
        `UPDATE events SET payment_status = 'unpaid' WHERE id = $1 AND payment_status = 'pending'
         AND NOT EXISTS (SELECT 1 FROM payments WHERE event_id = $1 AND status = 'pending')`, [payment.event_id]);
      await log.error('payments', payments.testMode, `Оплата отклонена ${payment.id}`);
    }
  }

  app.post('/webhooks/payments', asyncRoute(async (req, res) => {
    await handlePaymentWebhook(req.rawBody, req.get('x-signature'));
    res.json({ ok: true });
  }));

  // ---------- Рассылка ----------

  app.post('/api/events/:id/send', auth, asyncRoute(async (req, res) => {
    const event = await loadEvent(req);
    // Статус оплаты проверяется по базе, которую меняет только подписанный вебхук провайдера.
    if (event.payment_status !== 'paid') throw new HttpError(402, 'Сначала оплатите мероприятие');
    const queued = await messaging.enqueueInvites(event.id);
    res.json({ queued, testMode: whatsapp.testMode });
  }));

  app.get('/api/notifications', auth, asyncRoute(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, event_id, text, created_at, read_at FROM notifications WHERE organizer_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.organizer.id],
    );
    res.json(rows.map((n) => ({ id: n.id, eventId: n.event_id, text: n.text, createdAt: n.created_at, read: !!n.read_at })));
  }));

  app.post('/api/notifications/read', auth, asyncRoute(async (req, res) => {
    await pool.query('UPDATE notifications SET read_at = now() WHERE organizer_id = $1 AND read_at IS NULL', [req.organizer.id]);
    res.json({ ok: true });
  }));

  // ---------- Вебхук WhatsApp ----------

  app.get('/webhooks/whatsapp', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.whatsapp.verifyToken) {
      return res.send(String(req.query['hub.challenge'] ?? ''));
    }
    res.sendStatus(403);
  });

  app.post('/webhooks/whatsapp', asyncRoute(async (req, res) => {
    if (!verifyWebhookSignature(config.whatsapp.appSecret, req.rawBody, req.get('x-hub-signature-256'))) {
      await log.error('whatsapp', whatsapp.testMode, 'Вебхук WhatsApp с неверной подписью отклонён');
      throw new HttpError(401, 'Неверная подпись');
    }
    try {
      await messaging.handleWebhook(req.body);
    } catch (err) {
      await log.error('whatsapp', whatsapp.testMode, `Ошибка обработки вебхука: ${err.message}`);
      throw err; // 500 → Meta повторит доставку, повтор отсеется по webhook_events
    }
    res.json({ ok: true });
  }));

  // ---------- Страница гостя ----------

  const guestLimiter = rateLimit({ windowMs: 60_000, max: 60 });

  async function loadGuest(token) {
    const guestId = parseGuestToken(config.linkSecret, token);
    if (!guestId) return null;
    const { rows } = await pool.query(
      `SELECT g.*, e.title, e.event_date, e.event_time, e.address, e.invitation_text, e.organizer_id
       FROM guests g JOIN events e ON e.id = g.event_id WHERE g.id = $1`, [guestId]);
    return rows[0] || null;
  }

  async function isOptedOut(phone) {
    const { rowCount } = await pool.query('SELECT 1 FROM opt_outs WHERE phone_hash = $1', [phoneHash(config.linkSecret, phone)]);
    return rowCount > 0;
  }

  function guestHeaders(res) {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
  }

  app.get('/r/:token', guestLimiter, asyncRoute(async (req, res) => {
    guestHeaders(res);
    const row = await loadGuest(req.params.token);
    if (!row) return res.status(404).type('html').send(notFoundPage());
    res.type('html').send(rsvpPage({ guest: row, event: row, token: req.params.token, optedOut: await isOptedOut(row.phone) }));
  }));

  app.post('/r/:token', guestLimiter, asyncRoute(async (req, res) => {
    guestHeaders(res);
    const row = await loadGuest(req.params.token);
    if (!row) return res.status(404).type('html').send(notFoundPage());
    const answer = req.body.answer;
    if (!['yes', 'no'].includes(answer)) throw new HttpError(400, 'Неверный ответ');
    if (row.rsvp !== answer) {
      await pool.query('UPDATE guests SET rsvp = $2, responded_at = now() WHERE id = $1', [row.id, answer]);
      // Уже запланированные напоминания этому гостю не уйдут.
      await pool.query(`UPDATE messages SET status = 'skipped', last_error = 'Гость уже ответил', updated_at = now()
                        WHERE guest_id = $1 AND kind <> 'invite' AND status = 'queued'`, [row.id]);
      const verb = answer === 'yes' ? 'придёт' : 'не сможет прийти';
      await notify(row.organizer_id, row.event_id, `${row.name} ${verb} на «${row.title}»`);
    }
    if (req.accepts(['html', 'json']) === 'json') return res.json({ rsvp: answer });
    res.redirect(303, `/r/${req.params.token}`);
  }));

  app.post('/r/:token/optout', guestLimiter, asyncRoute(async (req, res) => {
    guestHeaders(res);
    const row = await loadGuest(req.params.token);
    if (!row) return res.status(404).type('html').send(notFoundPage());
    await messaging.optOut(row.phone, 'rsvp_page');
    res.redirect(303, `/r/${req.params.token}`);
  }));

  // ---------- Тестовый режим и журнал ----------

  const adminAuth = (req, res, next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /, '') || req.query.token;
    if (token !== config.adminToken) return res.sendStatus(401);
    next();
  };

  app.get('/admin/logs', adminAuth, asyncRoute(async (req, res) => {
    const level = req.query.level === 'error' ? 'error' : null;
    const { rows } = await pool.query(
      `SELECT * FROM integration_logs WHERE ($1::text IS NULL OR level = $1) ORDER BY id DESC LIMIT 200`, [level]);
    res.json(rows);
  }));

  if (payments.testMode) {
    app.get('/test/pay/:paymentId', asyncRoute(async (req, res) => {
      const { rows } = await pool.query('SELECT p.*, e.title FROM payments p JOIN events e ON e.id = p.event_id WHERE p.id = $1', [req.params.paymentId]);
      if (!rows[0]) return res.status(404).type('html').send(notFoundPage());
      res.type('html').send(testCheckoutPage({ payment: rows[0], event: rows[0] }));
    }));
    app.post('/test/pay/:paymentId', asyncRoute(async (req, res) => {
      const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.paymentId]);
      if (!rows[0]) return res.status(404).type('html').send(notFoundPage());
      const status = req.body.result === 'paid' ? 'paid' : 'failed';
      // Эмулятор отправляет такой же подписанный вебхук, как настоящий провайдер.
      const hook = payments.buildWebhook({ providerPaymentId: rows[0].provider_payment_id, amountKzt: rows[0].amount_kzt, status });
      await handlePaymentWebhook(Buffer.from(hook.body), hook.signature);
      res.redirect(303, `/test/pay/${req.params.paymentId}`);
    }));
  }

  if (whatsapp.testMode) {
    app.get('/test/whatsapp', adminAuth, (req, res) => res.type('html').send(outboxPage(whatsapp.outbox)));
  }

  app.use((req, res) => res.status(404).json({ error: 'Не найдено' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Неверный JSON' });
    if (err.code === '22P02') return res.status(404).json({ error: 'Не найдено' }); // некорректный uuid
    if (!(err instanceof HttpError)) console.error(err);
    const status = err instanceof HttpError ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Внутренняя ошибка сервера' : err.message });
  });

  return app;
}
