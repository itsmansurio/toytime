// Push-уведомления организатору через Expo Push Service.
export function createPushClient(config, log) {
  const testMode = config.push.testMode;
  const sent = [];
  return {
    testMode,
    sent,
    async send(pushToken, title, body, data) {
      if (!pushToken) return;
      if (testMode) {
        sent.push({ pushToken, title, body, data });
        await log.info('push', true, `Эмуляция push: ${title}`, { body });
        return;
      }
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        await log.error('push', false, `Push не отправлен: ${err.message}`);
      }
    },
  };
}
