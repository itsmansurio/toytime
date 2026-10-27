-- ToyTime: начальная схема

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Организатор. Входа по паролю нет: приложение получает токен устройства
-- после явного согласия на обработку персональных данных.
CREATE TABLE organizers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  name          text,
  push_token    text,
  consent_at    timestamptz NOT NULL,
  consent_version text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id         uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  title                text NOT NULL,
  event_date           date NOT NULL,
  event_time           text NOT NULL,           -- HH:MM, время Казахстана
  starts_at            timestamptz NOT NULL,
  address              text NOT NULL,
  invitation_text      text NOT NULL,
  first_reminder_days  int  NOT NULL DEFAULT 7 CHECK (first_reminder_days IN (7, 10)),
  payment_status       text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
  invites_sent_at      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_organizer_idx ON events (organizer_id);

CREATE TABLE guests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          text NOT NULL,
  phone         text NOT NULL,                  -- E.164, +7XXXXXXXXXX
  rsvp          text NOT NULL DEFAULT 'pending' CHECK (rsvp IN ('pending', 'yes', 'no')),
  responded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, phone)
);

-- Исходящие сообщения WhatsApp. UNIQUE (guest_id, kind) гарантирует,
-- что одно и то же приглашение или напоминание не будет создано дважды.
CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id            uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  kind                text NOT NULL,            -- invite | reminder_first | reminder_3d | reminder_day
  template            text NOT NULL,
  status              text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped', 'unknown')),
  provider_message_id text UNIQUE,
  attempts            int  NOT NULL DEFAULT 0,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  locked_at           timestamptz,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, kind)
);
CREATE INDEX messages_queue_idx ON messages (next_attempt_at) WHERE status = 'queued';

-- Отказ от сообщений хранится по хэшу телефона и действует для всех мероприятий.
CREATE TABLE opt_outs (
  phone_hash  text PRIMARY KEY,
  source      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider            text NOT NULL,
  provider_payment_id text,
  amount_kzt          int  NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  confirmed_at        timestamptz
);
CREATE INDEX payments_event_idx ON payments (event_id);

-- Повторно пришедшие вебхуки (WhatsApp и платёжный провайдер повторяют доставку)
-- обрабатываются один раз.
CREATE TABLE webhook_events (
  provider     text NOT NULL,
  external_id  text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_id)
);

-- Журнал внешних интеграций: WhatsApp, оплата, push.
CREATE TABLE integration_logs (
  id           bigserial PRIMARY KEY,
  integration  text NOT NULL,
  level        text NOT NULL CHECK (level IN ('info', 'error')),
  test_mode    boolean NOT NULL,
  message      text NOT NULL,
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX integration_logs_created_idx ON integration_logs (created_at DESC);

CREATE TABLE notifications (
  id            bigserial PRIMARY KEY,
  organizer_id  uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  event_id      uuid REFERENCES events(id) ON DELETE CASCADE,
  text          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);
CREATE INDEX notifications_organizer_idx ON notifications (organizer_id, created_at DESC);
