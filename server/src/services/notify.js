// Уведомления организатору: запись в ленту (видна в приложении) + push.
export function createNotifier({ pool, push }) {
  return async function notify(organizerId, eventId, text) {
    await pool.query('INSERT INTO notifications (organizer_id, event_id, text) VALUES ($1, $2, $3)', [organizerId, eventId, text]);
    const { rows } = await pool.query('SELECT push_token FROM organizers WHERE id = $1', [organizerId]);
    if (rows[0]?.push_token) await push.send(rows[0].push_token, 'ToiTime', text, { eventId });
  };
}
