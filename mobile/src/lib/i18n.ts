// Языки приложения: русский и казахский. Ключ перевода — русская строка,
// поэтому без перевода показывается русский текст, а не пустое место.
import { KK } from './i18n.kk';

export type Lang = 'ru' | 'kk';
export let lang: Lang = 'ru';

export function applyLang(next: Lang) { lang = next; }

export function t(ru: string, vars?: Record<string, string | number>): string {
  let s = lang === 'kk' ? (KK[ru] ?? ru) : ru;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? ''));
  return s;
}

// Уведомления приходят с сервера по-русски; на казахском показываем их перевод.
const SERVER_TEXT: [RegExp, (...m: string[]) => string][] = [
  [/^(.+) придёт на «(.+)»$/, (_, n, e) => `${n} келеді: «${e}»`],
  [/^(.+) не сможет прийти на «(.+)»$/, (_, n, e) => `${n} келе алмайды: «${e}»`],
  [/^Оплата за «(.+)» подтверждена$/, (_, e) => `«${e}» үшін төлем расталды`],
  [/^Не удалось отправить сообщение гостю (.+?): (.+)$/, (_, n, r) => `${n} қонағына хабарлама жіберілмеді: ${r}`],
  [/^Сообщение гостю (.+?) не доставлено: (.+)$/, (_, n, r) => `${n} қонағына хабарлама жеткізілмеді: ${r}`],
];
export function translateServerText(text: string): string {
  if (lang !== 'kk') return text;
  for (const [re, fn] of SERVER_TEXT) {
    const m = re.exec(text);
    if (m) return fn(...m);
  }
  return text;
}

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'kk', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
];
