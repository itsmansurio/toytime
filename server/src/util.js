import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hmac(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest();
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Номера Казахстана: +7 7XX XXX XX XX. Принимаем 8XXXXXXXXXX, 7XXXXXXXXXX, +7..., 10 цифр.
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 10) digits = '7' + digits;
  if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length === 11 && digits.startsWith('7')) return '+' + digits;
  // Иностранные номера в формате E.164 тоже допускаем.
  if (input.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) return '+' + digits;
  return null;
}

export function phoneHash(secret, phone) {
  return hmac(secret, 'phone:' + phone).toString('hex');
}

// Защищённая ссылка гостя: id гостя + HMAC. Подделать или подобрать её нельзя,
// а сменив LINK_SECRET, можно разом отозвать все ссылки.
export function guestToken(secret, guestId) {
  const id = Buffer.from(guestId.replace(/-/g, ''), 'hex');
  const sig = hmac(secret, 'rsvp:' + guestId).subarray(0, 16);
  return Buffer.concat([id, sig]).toString('base64url');
}

export function parseGuestToken(secret, token) {
  if (typeof token !== 'string' || token.length > 64) return null;
  const raw = Buffer.from(token, 'base64url');
  if (raw.length !== 32) return null;
  const hex = raw.subarray(0, 16).toString('hex');
  const guestId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const expected = hmac(secret, 'rsvp:' + guestId).subarray(0, 16);
  if (!crypto.timingSafeEqual(raw.subarray(16), expected)) return null;
  return guestId;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
};
// «28 ноября 2026 года» / «2026 жылғы 28 қараша».
export function formatDate(isoDate, lang = 'ru') {
  const [y, m, d] = isoDate.split('-').map(Number);
  return lang === 'kk' ? `${y} жылғы ${d} ${MONTHS.kk[m - 1]}` : `${d} ${MONTHS.ru[m - 1]} ${y} года`;
}
export const formatDateRu = (isoDate) => formatDate(isoDate, 'ru');

// Публичная ссылка на фото/видео приглашения. В подписи версия файла, поэтому
// после замены файла старая ссылка перестаёт работать, а WhatsApp не берёт старый кэш.
export function mediaToken(secret, eventId, updatedAt) {
  const version = new Date(updatedAt).getTime().toString(36);
  const sig = hmac(secret, `media:${eventId}:${version}`).subarray(0, 12).toString('base64url');
  return `${eventId}.${version}.${sig}`;
}

export function parseMediaToken(secret, token) {
  const [eventId, version, sig] = String(token).split('.');
  if (!eventId || !version || !sig || eventId.length !== 36) return null;
  const expected = hmac(secret, `media:${eventId}:${version}`).subarray(0, 12).toString('base64url');
  return safeEqual(sig, expected) ? { eventId, version } : null;
}
