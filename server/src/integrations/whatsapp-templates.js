// Шаблоны сообщений WhatsApp. До отправки в реальном режиме каждый шаблон
// нужно создать и получить одобрение в WhatsApp Manager с теми же именами,
// языками (ru и kk) и порядком переменных. Тексты ниже — то, что подаётся на одобрение.
//
// Приглашение существует в трёх вариантах, потому что тип шапки (текст, фото, видео)
// задаётся в самом шаблоне: toytime_invite, toytime_invite_image, toytime_invite_video.
// Тексты у них одинаковые.
import { formatDate } from '../util.js';

const INVITE_BODY = {
  ru:
    'Ассаламу алейкум, {{1}}!\n\n{{2}} приглашает вас на мероприятие «{{3}}».\n\n' +
    '📅 Дата: {{4}}\n🕒 Время: {{5}}\n📍 Место: {{6}}\n📞 Телефон организатора: {{7}}\n\n{{8}}\n\n' +
    'Пожалуйста, ответьте по кнопке ниже, придёте ли вы. Чтобы не получать сообщения, напишите СТОП.',
  kk:
    'Ассалаумағалейкум, {{1}}!\n\n{{2}} сізді мерекеге шақырады: «{{3}}».\n\n' +
    '📅 Күні: {{4}}\n🕒 Уақыты: {{5}}\n📍 Мекенжайы: {{6}}\n📞 Той иесінің телефоны: {{7}}\n\n{{8}}\n\n' +
    'Келетін-келмейтініңізді төмендегі батырма арқылы хабарлаңыз. Хабарлама алмау үшін СТОП деп жазыңыз.',
};

const REMINDER_BODY = {
  ru:
    '{{1}}, напоминаем о мероприятии «{{2}}» {{3}} в {{4}}, место: {{5}}.\n\n' +
    'Вы ещё не ответили, придёте ли. Ответить можно по кнопке ниже. Чтобы не получать сообщения, напишите СТОП.',
  kk:
    '{{1}}, «{{2}}» мерекесін еске саламыз: {{3}}, сағат {{4}}, мекенжайы: {{5}}.\n\n' +
    'Сіз әлі жауап бермедіңіз. Келетін-келмейтініңізді төмендегі батырма арқылы хабарлаңыз. Хабарлама алмау үшін СТОП деп жазыңыз.',
};

const REMINDER_YES_BODY = {
  ru:
    '{{1}}, напоминаем: ждём вас на мероприятии «{{2}}» {{3}} в {{4}}, место: {{5}}.\n\n' +
    'Вы ответили «Приду». Если планы изменились, поменяйте ответ по кнопке ниже. Чтобы не получать сообщения, напишите СТОП.',
  kk:
    '{{1}}, «{{2}}» мерекесін еске саламыз: {{3}}, сағат {{4}}, мекенжайы: {{5}}.\n\n' +
    'Сіз «Барамын» деп жауап бердіңіз, сізді күтеміз! Жоспарыңыз өзгерсе, жауабыңызды төмендегі батырма арқылы өзгертіңіз. Хабарлама алмау үшін СТОП деп жазыңыз.',
};

const BUTTON = {
  ru: { type: 'URL', text: 'Ответить', url: '{PUBLIC_URL}/r/{{1}}' },
  kk: { type: 'URL', text: 'Жауап беру', url: '{PUBLIC_URL}/r/{{1}}' },
};

const DEFAULT_HOST = { ru: 'Организатор праздника', kk: 'Той иесі' };
const NO_PHONE = { ru: 'уточняйте у организатора', kk: 'той иесінен сұраңыз' };

export const TEMPLATES = {
  toytime_invite: { category: 'UTILITY', header: null, body: INVITE_BODY, button: BUTTON },
  toytime_invite_image: { category: 'UTILITY', header: 'IMAGE', body: INVITE_BODY, button: BUTTON },
  toytime_invite_video: { category: 'UTILITY', header: 'VIDEO', body: INVITE_BODY, button: BUTTON },
  // Напоминание тем, кто ещё не ответил.
  toytime_reminder: { category: 'UTILITY', header: null, body: REMINDER_BODY, button: BUTTON },
  // Напоминание тем, кто ответил «Приду».
  toytime_reminder_yes: { category: 'UTILITY', header: null, body: REMINDER_YES_BODY, button: BUTTON },
};

// Meta не принимает в переменных переводы строк, табуляцию и более 4 пробелов подряд.
function param(value, max = 300) {
  return String(value).replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, max) || '-';
}

// +77011234567 → +7 701 123 45 67
export function formatPhone(phone) {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone || '');
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

// media: { type: 'image' | 'video', link } — фото или видео приглашения, если организатор его добавил.
export function buildTemplateMessage(kind, { guest, event, token, media }) {
  const lang = event.lang === 'kk' ? 'kk' : 'ru';
  let template;
  if (kind === 'invite') template = media ? `toytime_invite_${media.type}` : 'toytime_invite';
  else template = guest.rsvp === 'yes' ? 'toytime_reminder_yes' : 'toytime_reminder';
  const common = [event.title, formatDate(event.event_date, lang), event.event_time, event.address];
  const bodyParams = kind === 'invite'
    ? [guest.name, event.host_name || DEFAULT_HOST[lang], ...common, event.host_phone ? formatPhone(event.host_phone) : NO_PHONE[lang], event.invitation_text]
    : [guest.name, ...common];
  return {
    template,
    language: lang,
    header: kind === 'invite' && media ? media : null,
    bodyParams: bodyParams.map((v, i) => param(v, kind === 'invite' && i === 7 ? 700 : 300)),
    buttonUrlSuffix: token,
  };
}

// Текст для предпросмотра в эмуляторе: подставляет переменные в шаблон.
export function renderPreview(message, publicUrl) {
  const tpl = TEMPLATES[message.template];
  const lang = message.language === 'kk' ? 'kk' : 'ru';
  const body = tpl.body[lang].replace(/\{\{(\d+)\}\}/g, (_, n) => message.bodyParams[Number(n) - 1] ?? '');
  const head = message.header ? `[${message.header.type === 'video' ? 'Видео' : 'Фото'}] ${message.header.link}\n\n` : '';
  return `${head}${body}\n\n[${tpl.button[lang].text}] ${publicUrl}/r/${message.buttonUrlSuffix}`;
}
