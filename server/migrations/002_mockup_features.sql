-- Функции из макета заказчика: подпись приглашения, выбор получателей,
-- отключаемые напоминания.
ALTER TABLE events ADD COLUMN host_name text;
ALTER TABLE events ADD COLUMN reminders_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE guests ADD COLUMN selected boolean NOT NULL DEFAULT true;
-- Кто поставил ответ: сам гость по ссылке или организатор вручную.
ALTER TABLE guests ADD COLUMN rsvp_source text CHECK (rsvp_source IN ('guest', 'organizer'));
