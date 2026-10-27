// Демо-запуск одной командой без установки PostgreSQL: встроенная база PGlite
// (PostgreSQL, скомпилированный в WebAssembly). Только для теста на своём компьютере.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = 54329;
const db = await PGlite.create({ dataDir: './demo-data', extensions: { pgcrypto } });
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();

process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
process.env.PG_POOL_MAX = '1'; // PGlite обслуживает одно соединение за раз
process.env.CORS_ORIGIN ||= 'http://localhost:8081';
console.log('Демо-режим: встроенная база данных в папке server/demo-data');
await import('./index.js');
