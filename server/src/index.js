import { loadConfig } from './config.js';
import { migrate } from './db.js';
import { createContext, startWorker } from './context.js';
import { createApp } from './app.js';

const config = loadConfig();
const ctx = createContext(config);
await migrate(ctx.pool);
const app = createApp(ctx);
app.listen(config.port, () => {
  console.log(`ToyTime сервер: ${config.publicUrl} (порт ${config.port})`);
  console.log(`WhatsApp: ${ctx.whatsapp.testMode ? 'ТЕСТОВЫЙ РЕЖИМ (эмулятор)' : 'Cloud API'}; оплата: ${ctx.payments.testMode ? 'ТЕСТОВЫЙ РЕЖИМ (эмулятор)' : ctx.payments.name}`);
});
startWorker(ctx);
