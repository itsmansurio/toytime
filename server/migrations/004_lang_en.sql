-- Английский язык приглашения.
ALTER TABLE events DROP CONSTRAINT events_lang_check;
ALTER TABLE events ADD CONSTRAINT events_lang_check CHECK (lang IN ('ru', 'kk', 'en'));
