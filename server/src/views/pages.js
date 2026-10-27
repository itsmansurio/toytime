import { escapeHtml as h, formatDateRu } from '../util.js';

const STYLE = `
  :root { --green:#0f5c3a; --green-light:#e8f3ec; --text:#1d2a24; --muted:#5f6f67; --red:#b3261e; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f4f7f5; color:var(--text); }
  main { max-width: 480px; margin: 0 auto; padding: 24px 16px 48px; }
  .brand { color: var(--green); font-weight: 700; font-size: 22px; margin-bottom: 16px; }
  .card { background:#fff; border-radius:16px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:16px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  .row { margin: 6px 0; color: var(--muted); }
  .text { white-space: pre-wrap; margin-top: 12px; line-height: 1.45; }
  button { width:100%; border:0; border-radius:12px; padding:16px; font-size:17px; font-weight:600; cursor:pointer; margin-top:10px; }
  .yes { background: var(--green); color:#fff; }
  .no { background:#fff; color: var(--green); border:2px solid var(--green); }
  .link { background:none; color:var(--muted); font-size:14px; font-weight:400; text-decoration:underline; padding:8px; }
  .status { background: var(--green-light); border-radius:12px; padding:14px; font-weight:600; text-align:center; }
  .banner { background:#fff4d6; border-radius:12px; padding:12px; font-size:14px; margin-bottom:16px; }
  small { color: var(--muted); }
`;

function layout(title, body) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${h(title)}</title><style>${STYLE}</style></head>
<body><main><div class="brand">ToyTime</div>${body}</main></body></html>`;
}

const ANSWER_TEXT = { yes: 'Вы ответили: «Приду». Спасибо!', no: 'Вы ответили: «Не смогу прийти». Спасибо, что сообщили.' };

export function rsvpPage({ guest, event, token, optedOut, flash }) {
  const status = guest.rsvp !== 'pending' ? `<div class="status">${ANSWER_TEXT[guest.rsvp]}</div>` : '';
  const askAgain = guest.rsvp === 'pending' ? 'Придёте?' : 'Изменить ответ';
  return layout(event.title, `
    ${flash ? `<div class="banner">${h(flash)}</div>` : ''}
    <div class="card">
      <h1>${h(event.title)}</h1>
      <div class="row">📅 ${h(formatDateRu(event.event_date))}, ${h(event.event_time)}</div>
      <div class="row">📍 ${h(event.address)}</div>
      <div class="text">${h(event.invitation_text)}</div>
    </div>
    <div class="card">
      <div style="margin-bottom:8px">${h(guest.name)}, ${askAgain.toLowerCase()}</div>
      ${status}
      <form method="post" action="/r/${h(token)}">
        <button class="yes" name="answer" value="yes">Приду</button>
        <button class="no" name="answer" value="no">Не смогу прийти</button>
      </form>
    </div>
    <form method="post" action="/r/${h(token)}/optout">
      ${optedOut
        ? '<p style="text-align:center"><small>Вы отказались от сообщений ToyTime. Напоминаний больше не будет.</small></p>'
        : '<button class="link">Не присылать мне сообщения</button>'}
    </form>
    <p style="text-align:center"><small>Приложение устанавливать не нужно. <a href="/privacy">Конфиденциальность</a></small></p>
  `);
}

export function notFoundPage() {
  return layout('Ссылка недействительна', '<div class="card"><h1>Ссылка недействительна</h1><p>Проверьте ссылку из приглашения или свяжитесь с организатором.</p></div>');
}

export function testCheckoutPage({ payment, event }) {
  return layout('Тестовая оплата', `
    <div class="banner">⚠️ Это тестовая страница оплаты. Деньги не списываются, реальный платёжный провайдер не подключён.</div>
    <div class="card">
      <h1>Оплата мероприятия</h1>
      <div class="row">${h(event.title)}</div>
      <div style="font-size:32px;font-weight:700;margin:12px 0">${payment.amount_kzt} ₸</div>
      ${payment.status === 'pending' ? `
      <form method="post"><button class="yes" name="result" value="paid">Тест: оплата прошла</button>
      <button class="no" name="result" value="failed">Тест: оплата отклонена</button></form>` : `<div class="status">Статус платежа: ${h(payment.status)}</div>`}
      <p><small>После «оплаты» провайдер отправляет серверу подписанное уведомление, и только тогда статус становится «оплачено». Вернитесь в приложение.</small></p>
    </div>`);
}

export function outboxPage(outbox) {
  const items = outbox.slice().reverse().map((m) => `
    <div class="card"><small>${h(m.sentAt)} → ${h(m.to)} · шаблон ${h(m.template)}</small>
    <div class="text">${h(m.preview)}</div></div>`).join('');
  return layout('Тестовые сообщения WhatsApp', `
    <div class="banner">Эмулятор WhatsApp: эти сообщения никуда не отправлялись.</div>${items || '<p>Пока пусто.</p>'}`);
}

export function privacyPage() {
  return layout('Политика конфиденциальности', `<div class="card">
    <h1>Политика конфиденциальности (черновик)</h1>
    <p><small>Черновик для MVP. Перед запуском его должен проверить юрист на соответствие Закону РК «О персональных данных и их защите».</small></p>
    <p><b>Какие данные мы обрабатываем.</b> Имя организатора (по желанию), данные мероприятия, имена и номера телефонов гостей, которых организатор сам выбрал или ввёл, ответы гостей и статусы доставки сообщений.</p>
    <p><b>Контакты телефона.</b> Приложение читает контакты только после вашего явного разрешения и только на вашем устройстве. На сервер передаются лишь те контакты, которых вы выбрали гостями, и только имя и номер.</p>
    <p><b>Зачем.</b> Чтобы отправить гостям приглашение и напоминания через WhatsApp и показать организатору их ответы. Рекламы нет, данные не передаются третьим лицам, кроме WhatsApp (Meta) для доставки сообщений и платёжного провайдера для оплаты.</p>
    <p><b>Отзыв согласия.</b> Организатор может в настройках приложения отозвать согласие: аккаунт, мероприятия и данные гостей удаляются с сервера. Гость может отказаться от сообщений по ссылке в приглашении или ответив «СТОП» в WhatsApp.</p>
  </div>`);
}
