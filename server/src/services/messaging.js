import { guestToken, phoneHash } from '../util.js';
import { buildTemplateMessage } from '../integrations/whatsapp-templates.js';

const STATUS_RANK = { queued: 0, sending: 0, unknown: 0, sent: 1, delivered: 2, read: 3 };
const STOP_WORDS = new Set(['стоп', 'stop', 'отписаться', 'unsubscribe', 'тоқтату']);

// Напоминания: первое (за 7 или 10 дней), за 3 дня и в день мероприятия.
export function reminderSchedule(event) {
  const start = new Date(event.starts_at).getTime();
  const day = 24 * 3600 * 1000;
  return [
    { kind: 'reminder_first', dueAt: new Date(start - event.first_reminder_days * day) },
    { kind: 'reminder_3d', dueAt: new Date(start - 3 * day) },
    { kind: 'reminder_day', dueAt: new Date(start - 5 * 3600 * 1000) },
  ];
}

export function createMessaging({ pool, config, whatsapp, log, notify }) {
  const wa = config.whatsapp;
  const optOutSql = `EXISTS (SELECT 1 FROM opt_outs o WHERE o.phone_hash = encode(hmac('phone:' || g.phone, $SECRET, 'sha256'), 'hex'))`;

  // Ставит приглашения в очередь всем гостям, которым их ещё не ставили.
  async function enqueueInvites(eventId) {
    const { rowCount } = await pool.query(
      `INSERT INTO messages (event_id, guest_id, kind, template)
       SELECT g.event_id, g.id, 'invite', 'toytime_invite' FROM guests g WHERE g.event_id = $1
       ON CONFLICT (guest_id, kind) DO NOTHING`,
      [eventId],
    );
    await pool.query('UPDATE events SET invites_sent_at = COALESCE(invites_sent_at, now()) WHERE id = $1', [eventId]);
    return rowCount;
  }

  // Создаёт напоминания только тем, кто не ответил и не отказался от сообщений.
  // Если сервер простаивал и наступило несколько сроков, отправится только последнее.
  async function scheduleReminders(now = new Date()) {
    const { rows: events } = await pool.query(
      `SELECT * FROM events WHERE payment_status = 'paid' AND invites_sent_at IS NOT NULL AND starts_at > $1`,
      [now],
    );
    let created = 0;
    for (const event of events) {
      const due = reminderSchedule(event).filter((r) => r.dueAt <= now).pop();
      if (!due) continue;
      const { rowCount } = await pool.query(
        `INSERT INTO messages (event_id, guest_id, kind, template)
         SELECT g.event_id, g.id, $2, 'toytime_reminder' FROM guests g
         JOIN messages inv ON inv.guest_id = g.id AND inv.kind = 'invite' AND inv.status IN ('sent', 'delivered', 'read')
         WHERE g.event_id = $1 AND g.rsvp = 'pending' AND inv.created_at < $3
           AND NOT ${optOutSql.replace('$SECRET', '$4')}
         ON CONFLICT (guest_id, kind) DO NOTHING`,
        [event.id, due.kind, due.dueAt, config.linkSecret],
      );
      created += rowCount;
    }
    return created;
  }

  async function claimBatch(limit) {
    const { rows } = await pool.query(
      `UPDATE messages SET status = 'sending', locked_at = now(), attempts = attempts + 1, updated_at = now()
       WHERE id IN (
         SELECT id FROM messages WHERE status = 'queued' AND next_attempt_at <= now()
         ORDER BY next_attempt_at LIMIT $1 FOR UPDATE SKIP LOCKED)
       RETURNING *`,
      [limit],
    );
    return rows;
  }

  async function finish(id, fields) {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE messages SET ${sets}, locked_at = NULL, updated_at = now() WHERE id = $1`, [id, ...keys.map((k) => fields[k])]);
  }

  async function sendOne(message) {
    const { rows } = await pool.query(
      `SELECT g.*, e.title, e.event_date, e.event_time, e.address, e.invitation_text, e.payment_status, e.organizer_id,
              ${optOutSql.replace('$SECRET', '$2')} AS opted_out
       FROM guests g JOIN events e ON e.id = g.event_id WHERE g.id = $1`,
      [message.guest_id, config.linkSecret],
    );
    const row = rows[0];
    if (!row) return finish(message.id, { status: 'skipped', last_error: 'Гость удалён' });
    if (row.payment_status !== 'paid') return finish(message.id, { status: 'skipped', last_error: 'Мероприятие не оплачено' });
    if (row.opted_out) return finish(message.id, { status: 'skipped', last_error: 'Гость отказался от сообщений' });
    if (message.kind !== 'invite' && row.rsvp !== 'pending') return finish(message.id, { status: 'skipped', last_error: 'Гость уже ответил' });

    const payload = buildTemplateMessage(message.kind, { guest: row, event: row, token: guestToken(config.linkSecret, row.id) });
    try {
      const { providerMessageId } = await whatsapp.sendTemplate({ to: row.phone, ...payload });
      await finish(message.id, { status: 'sent', provider_message_id: providerMessageId, last_error: null });
      await log.info('whatsapp', whatsapp.testMode, `Отправлено ${message.kind} гостю ${row.id}`, { messageId: message.id, providerMessageId });
    } catch (err) {
      const details = { messageId: message.id, kind: message.kind, attempt: message.attempts, code: err.code };
      if (err.retryable && message.attempts < wa.maxAttempts) {
        const delaySec = 30 * 2 ** (message.attempts - 1);
        await finish(message.id, { status: 'queued', last_error: err.message, next_attempt_at: new Date(Date.now() + delaySec * 1000) });
        await log.error('whatsapp', whatsapp.testMode, `Ошибка отправки, повтор через ${delaySec} с: ${err.message}`, details);
      } else {
        const status = err.ambiguous ? 'unknown' : 'failed';
        await finish(message.id, { status, last_error: err.message });
        await log.error('whatsapp', whatsapp.testMode, `Сообщение не доставлено (${status}): ${err.message}`, details);
        await notify(row.organizer_id, row.event_id, `Не удалось отправить сообщение гостю ${row.name}: ${err.message}`);
      }
    }
  }

  async function processQueue(limit = 50) {
    const batch = await claimBatch(limit);
    for (const message of batch) await sendOne(message);
    return batch.length;
  }

  // Сообщение, зависшее в отправке (например, сервер упал во время запроса),
  // могло уйти. Повторно его не шлём, а помечаем для ручной проверки.
  async function recoverStale(maxAgeMs = 10 * 60 * 1000) {
    const { rows } = await pool.query(
      `UPDATE messages SET status = 'unknown', last_error = 'Отправка прервана, исход неизвестен', locked_at = NULL, updated_at = now()
       WHERE status = 'sending' AND locked_at < now() - ($1 || ' milliseconds')::interval RETURNING id`,
      [String(maxAgeMs)],
    );
    for (const r of rows) await log.error('whatsapp', whatsapp.testMode, 'Зависшая отправка помечена как unknown', { messageId: r.id });
    return rows.length;
  }

  async function firstSeen(provider, externalId) {
    const { rowCount } = await pool.query(
      'INSERT INTO webhook_events (provider, external_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [provider, externalId],
    );
    return rowCount === 1;
  }

  // Обработка вебхука WhatsApp: статусы доставки и входящие сообщения (отписка).
  async function handleWebhook(payload) {
    for (const entry of payload?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const st of value.statuses ?? []) await applyStatus(st);
        for (const msg of value.messages ?? []) await applyInbound(msg);
      }
    }
  }

  async function applyStatus(st) {
    if (!st?.id || !st?.status) return;
    if (!(await firstSeen('whatsapp', `${st.id}:${st.status}`))) return;
    const { rows } = await pool.query(
      `SELECT m.*, g.name AS guest_name, e.organizer_id FROM messages m
       JOIN guests g ON g.id = m.guest_id JOIN events e ON e.id = m.event_id WHERE m.provider_message_id = $1`,
      [st.id],
    );
    const msg = rows[0];
    if (!msg) {
      await log.error('whatsapp', whatsapp.testMode, 'Статус для неизвестного сообщения', { providerMessageId: st.id, status: st.status });
      return;
    }
    if (st.status === 'failed') {
      if (STATUS_RANK[msg.status] >= 2) return;
      const reason = st.errors?.[0]?.title || st.errors?.[0]?.message || 'ошибка доставки';
      await finish(msg.id, { status: 'failed', last_error: reason });
      await log.error('whatsapp', whatsapp.testMode, `Доставка не удалась: ${reason}`, { messageId: msg.id, errors: st.errors });
      await notify(msg.organizer_id, msg.event_id, `Сообщение гостю ${msg.guest_name} не доставлено: ${reason}`);
      return;
    }
    // Статусы могут прийти не по порядку: не понижаем delivered до sent.
    if (STATUS_RANK[st.status] === undefined || STATUS_RANK[st.status] <= (STATUS_RANK[msg.status] ?? 0)) return;
    await finish(msg.id, { status: st.status });
  }

  async function applyInbound(msg) {
    if (!msg?.id || !msg.from) return;
    if (!(await firstSeen('whatsapp', msg.id))) return;
    const text = (msg.text?.body ?? msg.button?.text ?? '').trim().toLowerCase();
    if (STOP_WORDS.has(text)) {
      await optOut('+' + msg.from, 'whatsapp');
    }
  }

  async function optOut(phone, source) {
    await pool.query('INSERT INTO opt_outs (phone_hash, source) VALUES ($1, $2) ON CONFLICT DO NOTHING', [phoneHash(config.linkSecret, phone), source]);
    // Уже поставленные в очередь напоминания этому номеру не уйдут.
    await pool.query(
      `UPDATE messages m SET status = 'skipped', last_error = 'Гость отказался от сообщений', updated_at = now()
       FROM guests g WHERE g.id = m.guest_id AND g.phone = $1 AND m.status = 'queued'`,
      [phone],
    );
  }

  return { enqueueInvites, scheduleReminders, processQueue, recoverStale, handleWebhook, optOut, firstSeen };
}
