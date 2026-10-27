// Журнал внешних интеграций. Пишет в БД и в stdout; ошибка записи журнала
// не должна ронять основную операцию.
export function createIntegrationLog(pool) {
  async function write(integration, level, testMode, message, details) {
    const line = `[${integration}${testMode ? ':test' : ''}] ${level.toUpperCase()} ${message}`;
    if (level === 'error') console.error(line); else if (process.env.NODE_ENV !== 'test') console.log(line);
    try {
      await pool.query(
        'INSERT INTO integration_logs (integration, level, test_mode, message, details) VALUES ($1, $2, $3, $4, $5)',
        [integration, level, testMode, message, details ? JSON.stringify(details) : null],
      );
    } catch (err) {
      console.error('Не удалось записать журнал интеграции:', err.message);
    }
  }
  return {
    info: (integration, testMode, message, details) => write(integration, 'info', testMode, message, details),
    error: (integration, testMode, message, details) => write(integration, 'error', testMode, message, details),
  };
}
