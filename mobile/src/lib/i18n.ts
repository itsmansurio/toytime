// Языки приложения: русский, казахский и английский. Ключ перевода — русская строка,
// поэтому без перевода показывается русский текст, а не пустое место.
import { KK } from './i18n.kk';
import { EN } from './i18n.en';

export type Lang = 'ru' | 'kk' | 'en';
const DICT: Record<Lang, Record<string, string> | null> = { ru: null, kk: KK, en: EN };
export let lang: Lang = 'ru';

export function applyLang(next: Lang) { lang = next; }

export function t(ru: string, vars?: Record<string, string | number>): string {
  let s = DICT[lang]?.[ru] ?? ru;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? ''));
  return s;
}

// Уведомления приходят с сервера по-русски; на других языках показываем их перевод.
type Rule = [RegExp, (...m: string[]) => string];
const SERVER_TEXT: Record<'kk' | 'en', Rule[]> = {
  kk: [
    [/^(.+) придёт на «(.+)»$/, (_, n, e) => `${n} келеді: «${e}»`],
    [/^(.+) не сможет прийти на «(.+)»$/, (_, n, e) => `${n} келе алмайды: «${e}»`],
    [/^Оплата за «(.+)» подтверждена$/, (_, e) => `«${e}» үшін төлем расталды`],
    [/^Не удалось отправить сообщение гостю (.+?): (.+)$/, (_, n, r) => `${n} қонағына хабарлама жіберілмеді: ${r}`],
    [/^Сообщение гостю (.+?) не доставлено: (.+)$/, (_, n, r) => `${n} қонағына хабарлама жеткізілмеді: ${r}`],
  ],
  en: [
    [/^(.+) придёт на «(.+)»$/, (_, n, e) => `${n} is coming to “${e}”`],
    [/^(.+) не сможет прийти на «(.+)»$/, (_, n, e) => `${n} can’t come to “${e}”`],
    [/^Оплата за «(.+)» подтверждена$/, (_, e) => `Payment for “${e}” confirmed`],
    [/^Не удалось отправить сообщение гостю (.+?): (.+)$/, (_, n, r) => `Couldn’t send a message to ${n}: ${r}`],
    [/^Сообщение гостю (.+?) не доставлено: (.+)$/, (_, n, r) => `Message to ${n} not delivered: ${r}`],
  ],
};
export function translateServerText(text: string): string {
  if (lang === 'ru') return text;
  for (const [re, fn] of SERVER_TEXT[lang]) {
    const m = re.exec(text);
    if (m) return fn(...m);
  }
  return text;
}

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'ru', label: 'Русский', short: 'RU' },
  { value: 'kk', label: 'Қазақша', short: 'KZ' },
  { value: 'en', label: 'English', short: 'EN' },
];
