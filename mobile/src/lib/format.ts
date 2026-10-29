import { lang as appLang, t, type Lang } from './i18n';

const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
};

// «28 ноября 2026» / «2026 ж. 28 қараша». Язык по умолчанию — язык приложения.
export function formatDate(iso: string, lang: Lang = appLang): string {
  const [y, m, d] = iso.split('-').map(Number);
  return lang === 'kk' ? `${y} ж. ${d} ${MONTHS.kk[m - 1]}` : `${d} ${MONTHS.ru[m - 1]} ${y}`;
}

export function toIsoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function toTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function shortDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Должно совпадать с расписанием на сервере (services/messaging.js):
// за 10 или 7 дней, за 3 дня и за 1 день до тоя, в 9:00 по времени Астаны (UTC+5).
export function reminderSchedule(eventDate: string, firstReminderDays: number) {
  const [y, m, d] = eventDate.split('-').map(Number);
  const at = (n: number) => new Date(Date.UTC(y, m - 1, d - n, 4, 0)); // 09:00 +05:00 = 04:00 UTC
  return [
    { kind: 'reminder_first', label: t('За {n} дней', { n: firstReminderDays }), at: at(firstReminderDays) },
    { kind: 'reminder_3d', label: t('За 3 дня'), at: at(3) },
    { kind: 'reminder_1d', label: t('За 1 день'), at: at(1) },
  ];
}

// Дата напоминания по Астане: «18.11.2026, 9:00».
export function astanaDate(d: Date): string {
  const local = new Date(d.getTime() + 5 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(local.getUTCDate())}.${p(local.getUTCMonth() + 1)}.${local.getUTCFullYear()}, ${local.getUTCHours()}:${p(local.getUTCMinutes())}`;
}

export function daysWord(n: number) {
  if (appLang === 'kk') return 'күн';
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

export function pluralGuests(n: number) {
  if (appLang === 'kk') return `${n} қонақ`;
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} гость`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} гостя`;
  return `${n} гостей`;
}
