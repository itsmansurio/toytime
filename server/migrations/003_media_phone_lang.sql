-- Доп. ТЗ: телефон хозяина, язык приглашения (ru/kk), фото или видео к приглашению.
ALTER TABLE events ADD COLUMN host_phone text;
ALTER TABLE events ADD COLUMN lang text NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'kk'));
-- Файл хранится отдельно, чтобы не тянуть его в каждый SELECT мероприятий.
CREATE TABLE event_media (
  event_id    uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  mime        text NOT NULL,
  size        int  NOT NULL,
  data        bytea NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
