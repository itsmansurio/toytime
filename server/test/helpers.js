import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { createPool, migrate } from '../src/db.js';
import { createContext } from '../src/context.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';
const TEST_DB = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/toytime_test';

export async function setup() {
  const config = loadConfig({ databaseUrl: TEST_DB, publicUrl: 'http://test.local' });
  const pool = createPool(TEST_DB);
  await migrate(pool);
  await pool.query('TRUNCATE organizers, opt_outs, webhook_events, integration_logs RESTART IDENTITY CASCADE');
  const ctx = createContext(config, { pool });
  const app = createApp(ctx);
  const api = request(app);
  return { ctx, app, api, pool, config };
}

export function futureDate(days) {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function newOrganizer(api) {
  const res = await api.post('/api/session').send({ consent: true, name: 'Айгерим' });
  return res.body.token;
}

export async function newEvent(api, token, overrides = {}) {
  const res = await api.post('/api/events').set('Authorization', `Bearer ${token}`).send({
    title: 'Свадебный той',
    event_date: futureDate(30),
    event_time: '19:00',
    address: 'Ресторан «Астана», ул. Нурсултана Назарбаева, 10',
    invitation_text: 'Будем рады видеть вас!',
    host_phone: '+7 701 555 44 33',
    ...overrides,
  });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body;
}

// Оплачивает мероприятие через эмулятор провайдера (подписанный вебхук).
export async function payEvent(api, token, eventId) {
  const pay = await api.post(`/api/events/${eventId}/payments`).set('Authorization', `Bearer ${token}`);
  await api.post(`/test/pay/${pay.body.paymentId}`).type('form').send({ result: 'paid' });
  return pay.body;
}
