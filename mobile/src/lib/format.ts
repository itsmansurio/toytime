const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
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

// Должно совпадать с расписанием на сервере (services/messaging.js).
export function reminderSchedule(startsAt: string, firstReminderDays: number) {
  const start = new Date(startsAt).getTime();
  const day = 24 * 3600 * 1000;
  return [
    { kind: 'reminder_first', label: `За ${firstReminderDays} дней`, at: new Date(start - firstReminderDays * day) },
    { kind: 'reminder_3d', label: 'За 3 дня', at: new Date(start - 3 * day) },
    { kind: 'reminder_day', label: 'В день мероприятия', at: new Date(start - 5 * 3600 * 1000) },
  ];
}

export function pluralGuests(n: number) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} гость`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} гостя`;
  return `${n} гостей`;
}
