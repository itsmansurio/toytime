import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Веб-версия, выложенная вместе с сервером, обращается к тому же адресу, с которого открыта.
const sameOrigin = Platform.OS === 'web' && typeof window !== 'undefined' && !window.location.port ? window.location.origin : null;

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL || sameOrigin || (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl || 'http://localhost:3000';

export type Rsvp = 'pending' | 'yes' | 'no';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export type InviteLang = 'ru' | 'kk' | 'en';
export interface EventMedia { type: 'image' | 'video'; mime: string; size: number; url: string }
export interface EventStats { total: number; yes: number; no: number; pending: number }
export interface EventItem {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  startsAt: string;
  address: string;
  invitationText: string;
  firstReminderDays: 7 | 10;
  hostName: string | null;
  hostPhone: string | null;
  lang: InviteLang;
  media?: EventMedia | null;
  remindersEnabled: boolean;
  paymentStatus: PaymentStatus;
  invitesSentAt: string | null;
  stats?: EventStats;
  messages?: { kind: string; status: string; n: number }[];
}
export interface EventInput {
  title: string; event_date: string; event_time: string; address: string; invitation_text: string;
  first_reminder_days: number; host_name?: string | null; host_phone: string; lang?: InviteLang; reminders_enabled?: boolean;
}
export interface Guest {
  id: string;
  name: string;
  phone: string;
  rsvp: Rsvp;
  respondedAt: string | null;
  rsvpSource: 'guest' | 'organizer' | null;
  selected: boolean;
  messageStatus: string | null;
}
export interface AppConfig {
  priceKzt: number;
  privacyUrl: string;
  testMode: { whatsapp: boolean; payments: boolean };
}
export interface NotificationItem { id: number; eventId: string | null; text: string; createdAt: string; read: boolean }

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(value: string | null) { token = value; }
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

// Сообщения об ошибках сервера переводятся на язык приложения.
let translateError: (message: string) => string = (m) => m;
export function setErrorTranslator(fn: (message: string) => string) { translateError = fn; }

async function request<T>(method: string, path: string, body?: unknown, raw?: { blob: Blob; type: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': raw ? raw.type : 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: raw ? raw.blob : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, translateError('Нет связи с сервером. Проверьте интернет.'));
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, translateError(json.error || `Ошибка ${res.status}`));
  return json as T;
}

export const api = {
  config: () => request<AppConfig>('GET', '/api/config'),
  createSession: (name?: string) => request<{ token: string }>('POST', '/api/session', { consent: true, name }),
  updateMe: (data: { name?: string; pushToken?: string | null }) => request('PATCH', '/api/me', data),
  deleteMe: () => request('DELETE', '/api/me'),
  events: () => request<EventItem[]>('GET', '/api/events'),
  event: (id: string) => request<EventItem>('GET', `/api/events/${id}`),
  createEvent: (data: EventInput) => request<EventItem>('POST', '/api/events', data),
  updateEvent: (id: string, data: Partial<EventInput>) => request<EventItem>('PATCH', `/api/events/${id}`, data),
  deleteEvent: (id: string) => request('DELETE', `/api/events/${id}`),
  uploadMedia: (id: string, blob: Blob, type: string) => request<EventItem>('PUT', `/api/events/${id}/media`, undefined, { blob, type }),
  deleteMedia: (id: string) => request('DELETE', `/api/events/${id}/media`),
  guests: (id: string) => request<Guest[]>('GET', `/api/events/${id}/guests`),
  addGuests: (id: string, guests: { name: string; phone: string }[]) =>
    request<{ added: Guest[]; rejected: { name: string; phone: string; reason: string }[] }>('POST', `/api/events/${id}/guests`, { guests }),
  deleteGuest: (id: string, guestId: string) => request('DELETE', `/api/events/${id}/guests/${guestId}`),
  updateGuest: (id: string, guestId: string, data: { rsvp?: Rsvp; selected?: boolean }) =>
    request('PATCH', `/api/events/${id}/guests/${guestId}`, data),
  selectAllGuests: (id: string, selected: boolean) => request('POST', `/api/events/${id}/guests/select`, { selected }),
  guestLink: (id: string, guestId: string) => request<{ url: string }>('GET', `/api/events/${id}/guests/${guestId}/link`),
  createPayment: (id: string) =>
    request<{ paymentId: string; checkoutUrl: string; amountKzt: number; testMode: boolean }>('POST', `/api/events/${id}/payments`),
  payment: (id: string) => request<{ paymentStatus: PaymentStatus; amountKzt: number; testMode: boolean }>('GET', `/api/events/${id}/payment`),
  send: (id: string) => request<{ queued: number; testMode: boolean }>('POST', `/api/events/${id}/send`),
  notifications: () => request<NotificationItem[]>('GET', '/api/notifications'),
  markNotificationsRead: () => request('POST', '/api/notifications/read'),
};
