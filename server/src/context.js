import { createPool } from './db.js';
import { createIntegrationLog } from './log.js';
import { createCloudApiClient, createEmulator } from './integrations/whatsapp.js';
import { createPaymentEmulator } from './integrations/payments.js';
import { createPushClient } from './integrations/push.js';
import { createNotifier } from './services/notify.js';
import { createMessaging } from './services/messaging.js';

export function createContext(config, { pool } = {}) {
  pool = pool || createPool(config.databaseUrl);
  const log = createIntegrationLog(pool);
  const whatsapp = config.whatsapp.testMode ? createEmulator(config) : createCloudApiClient(config);
  const payments = createPaymentEmulator(config);
  const push = createPushClient(config, log);
  const notify = createNotifier({ pool, push });
  const messaging = createMessaging({ pool, config, whatsapp, log, notify });
  return { pool, config, log, whatsapp, payments, push, notify, messaging };
}

// Фоновый цикл: напоминания, очередь отправки, зависшие отправки.
export function startWorker(ctx, intervalMs = 5000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await ctx.messaging.recoverStale();
      await ctx.messaging.scheduleReminders();
      await ctx.messaging.processQueue();
      // В тестовом режиме эмулятор присылает вебхуки о доставке, как это делает Meta.
      if (ctx.whatsapp.testMode) {
        const hook = ctx.whatsapp.takeStatusWebhook();
        if (hook) await ctx.messaging.handleWebhook(hook);
      }
    } catch (err) {
      console.error('Ошибка фонового цикла:', err);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(timer);
}
