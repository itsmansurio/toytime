import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';

const pool = createPool(loadConfig().databaseUrl);
await migrate(pool);
await pool.end();
console.log('Миграции применены');
