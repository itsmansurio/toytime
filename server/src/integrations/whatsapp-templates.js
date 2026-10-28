// Шаблоны сообщений WhatsApp. До отправки в реальном режиме каждый шаблон
// нужно создать и получить одобрение в WhatsApp Manager с теми же именами,
// языком и порядком переменных. Тексты ниже — то, что подаётся на одобрение.
import { formatDateRu } from '../util.js';

export const TEMPLATES = {
  toytime_invite: {
    category: 'UTILITY',
    language: 'ru',
    body:
      'Ассаламу алейкум, {{1}}!\n\n{{2}} приглашает вас на мероприятие «{{3}}».\n\n' +
      '📅 Дата: {{4}}\n🕒 Время: {{5}}\n📍 Место: {{6}}\n\n{{7}}\n\n' +
      'Пожалуйста, ответьте по кнопке ниже, придёте ли вы. Чтобы не получать сообщения, напишите СТОП.',
    button: { type: 'URL', text: 'Ответить', url: '{PUBLIC_URL}/r/{{1}}' },
  },
  toytime_reminder: {
    category: 'UTILITY',
    language: 'ru',
    body:
      '{{1}}, напоминаем о мероприятии «{{2}}» {{3}} в {{4}}, место: {{5}}.\n\n' +
      'Вы ещё не ответили, придёте ли. Ответить можно по кнопке ниже. Чтобы не получать сообщения, напишите СТОП.',
    button: { type: 'URL', text: 'Ответить', url: '{PUBLIC_URL}/r/{{1}}' },
  },
};

// Meta не принимает в переменных переводы строк, табуляцию и более 4 пробелов подряд.
function param(value, max = 300) {
  return String(value).replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, max) || '-';
}

export function buildTemplateMessage(kind, { guest, event, token }) {
  const template = kind === 'invite' ? 'toytime_invite' : 'toytime_reminder';
  const common = [event.title, formatDateRu(event.event_date), event.event_time, event.address];
  const bodyParams = kind === 'invite'
    ? [guest.name, event.host_name || 'Организатор праздника', ...common, event.invitation_text]
    : [guest.name, ...common];
  return {
    template,
    language: TEMPLATES[template].language,
    bodyParams: bodyParams.map((v, i) => param(v, kind === 'invite' && i === 6 ? 700 : 300)),
    buttonUrlSuffix: token,
  };
}

// Текст для предпросмотра в эмуляторе: подставляет переменные в шаблон.
export function renderPreview(message, publicUrl) {
  const tpl = TEMPLATES[message.template];
  const body = tpl.body.replace(/\{\{(\d+)\}\}/g, (_, n) => message.bodyParams[Number(n) - 1] ?? '');
  return `${body}\n\n[${tpl.button.text}] ${publicUrl}/r/${message.buttonUrlSuffix}`;
}
