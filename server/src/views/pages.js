import { escapeHtml as h, formatDateRu } from '../util.js';

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

// Иконки (Ionicons, MIT) инлайном, чтобы страница гостя не зависела от внешних скриптов.
const ICON = {
  calendar: '<path d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4ZM9 4v13M15 6.5v13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.3 7.5 9.5 4.3-1.2 7.5-5 7.5-9.5V6L12 3Z"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/>',
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

// Стиль по макету заказчика: тёмно-зелёная шапка со скруглением, салатовый акцент, белые карточки.
const STYLE = `
  :root { --green:#123c32; --green2:#1d6a54; --lime:#d8f27b; --bg:#f5f7f4; --text:#17231f; --muted:#738078; --line:#e5eae5;
          --soft:#3e4c45; --green-light:#eaf2e9; --red:#b94b43; --red-light:#ffebe8; --yes:#267143; --yes-light:#e3f5e8; }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin:0; font: 15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: var(--bg); color: var(--text); }
  main { max-width: 500px; margin: 0 auto; padding: 0 0 36px; }
  a { color: var(--green); }
  .hero { background: var(--green); color:#fff; padding: 22px 19px 26px; border-radius: 0 0 25px 25px; }
  .topline { display:flex; justify-content:space-between; align-items:center; }
  .brand { font-size: 23px; font-weight: 850; letter-spacing: -.8px; color:#fff; }
  .brand span { color: var(--lime); }
  .tag { font-size: 11px; border: 1px solid #ffffff44; border-radius: 20px; padding: 6px 9px; color: #e3eee8; }
  .kicker { margin-top: 24px; font-size: 13px; color: var(--lime); font-weight: 700; }
  .title { font-size: 27px; line-height: 1.12; font-weight: 800; margin: 6px 0 8px; letter-spacing: -.6px; }
  .sub { color: #c6d8d0; font-size: 13px; margin: 0; }
  .card { background:#fff; border: 1px solid var(--line); border-radius: 18px; margin: 0 16px 12px; padding: 16px; box-shadow: 0 3px 12px #17231f05; }
  .hero + .card, .hero + .banner { margin-top: 16px; }
  .greet { font-size: 17px; font-weight: 800; margin: 0 0 4px; letter-spacing: -.3px; }
  .invite { white-space: pre-wrap; color: var(--soft); line-height: 1.5; font-size: 15px; margin: 6px 0 0; }
  .facts { display:grid; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
  .fact { display:flex; gap: 11px; align-items:center; }
  .fact .ic { flex: none; width: 40px; height: 40px; border-radius: 14px; background: var(--green-light); color: var(--green); display:grid; place-items:center; }
  .fact b { display:block; font-size: 14px; } .fact span { color: var(--muted); font-size: 12px; }
  .chips { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .chip { display:inline-flex; align-items:center; gap:6px; padding: 9px 12px; border-radius: 12px; background: #edf2ee; color: var(--green);
          font-weight: 750; font-size: 13px; text-decoration: none; }
  .q { font-weight: 800; font-size: 18px; margin: 0 0 12px; letter-spacing: -.3px; }
  .btns { display:grid; gap: 8px; }
  button { font-family: inherit; cursor: pointer; }
  .btn { width:100%; border:0; border-radius: 12px; padding: 15px; font-size: 16px; font-weight: 750; display:flex; align-items:center; justify-content:center; gap:8px; }
  .btn:active { transform: scale(.99); }
  .yes { background: var(--lime); color: var(--green); }
  .no { background:#fff; color: var(--green); border: 1px solid var(--line); }
  .primary { background: var(--green); color:#fff; }
  .sel-yes .yes { box-shadow: 0 0 0 3px #1d6a5433; }
  .sel-no .no { background: var(--red-light); color: var(--red); border-color: var(--red-light); }
  .answer { display:flex; gap: 12px; align-items:center; border-radius: 14px; padding: 12px; margin-bottom: 12px; }
  .answer.yes-a { background: var(--yes-light); } .answer.no-a { background: var(--red-light); }
  .answer .big { flex:none; width: 42px; height: 42px; border-radius: 14px; display:grid; place-items:center; color:#fff; }
  .yes-a .big { background: var(--yes); } .no-a .big { background: var(--red); }
  .answer b { display:block; font-size: 15px; } .answer span { font-size: 12px; color: var(--soft); }
  .change { color: var(--muted); font-size: 12px; margin: 0 0 10px; }
  .foot { text-align:center; color: var(--muted); font-size: 12px; padding: 6px 24px; line-height: 1.6; }
  .linkbtn { background:none; border:0; color: var(--muted); text-decoration: underline; font-size: 12px; padding: 6px; }
  .banner { display:flex; gap:8px; align-items:center; background:#f1f6e6; color:#53663a; border-radius: 14px; padding: 12px; font-size: 12px; margin: 0 16px 12px; }
  .plain { padding: 16px; }
  .plain .card { margin: 0 0 12px; }
  h1 { font-size: 20px; margin: 0 0 12px; letter-spacing: -.3px; }
  .price { font-size: 29px; font-weight: 850; letter-spacing: -1px; margin: 4px 0; }
  .msg { white-space: pre-wrap; background: #fff; border-radius: 5px 15px 15px 15px; padding: 14px; font-size: 14px; line-height: 1.5; }
  .preview { background: #e6f0e7; border-radius: 16px; padding: 12px; }
  .meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
`;

const hero = ({ tag, kicker, title, sub }) => `
    <section class="hero">
      <div class="topline"><div class="brand">Toy<span>Time</span></div>${tag ? `<div class="tag">${h(tag)}</div>` : ''}</div>
      ${kicker ? `<div class="kicker">${h(kicker)}</div>` : ''}
      <div class="title"${kicker ? '' : ' style="margin-top:22px"'}>${h(title)}</div>
      ${sub ? `<p class="sub">${h(sub)}</p>` : ''}
    </section>`;

function layout(title, body, { bodyClass = '' } = {}) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#123c32">
<title>${h(title)}</title>
<style>${STYLE}</style></head>
<body class="${bodyClass}"><main>${body}</main></body></html>`;
}

function weekday(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function rsvpPage({ guest, event, token, optedOut, flash }) {
  const answered = guest.rsvp !== 'pending';
  const mapQuery = encodeURIComponent(event.address);
  const answerBlock = answered ? (guest.rsvp === 'yes'
    ? `<div class="answer yes-a"><div class="big">${icon('check', 26)}</div><div><b>Вы придёте — спасибо!</b><span>Организатор уже видит ваш ответ. До встречи на празднике!</span></div></div>`
    : `<div class="answer no-a"><div class="big">${icon('close', 24)}</div><div><b>Жаль, что не получится</b><span>Спасибо, что предупредили — организатор увидит ваш ответ.</span></div></div>`)
    : '';

  return layout(event.title, `
    ${hero({ tag: 'ПРИГЛАШЕНИЕ', kicker: event.host_name ? `${event.host_name} приглашает вас` : 'Вас приглашают на праздник', title: event.title, sub: `${formatDateRu(event.event_date)} · ${event.event_time}` })}

    ${flash ? `<div class="banner">${h(flash)}</div>` : ''}

    <section class="card">
      <p class="greet">Құрметті ${h(guest.name)}!</p>
      <p class="invite">${h(event.invitation_text)}</p>
      <div class="facts">
        <div class="fact"><div class="ic">${icon('calendar', 20)}</div><div><b>${h(formatDateRu(event.event_date))}</b><span>${h(weekday(event.event_date))}</span></div></div>
        <div class="fact"><div class="ic">${icon('time', 20)}</div><div><b>${h(event.event_time)}</b><span>начало</span></div></div>
        <div class="fact"><div class="ic">${icon('pin', 20)}</div><div><b>${h(event.address)}</b><span>место проведения</span></div></div>
      </div>
      <div class="chips">
        <a class="chip" href="https://2gis.kz/search/${mapQuery}" target="_blank" rel="noopener">${icon('map', 16)} 2ГИС</a>
        <a class="chip" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" rel="noopener">${icon('pin', 16)} Google Карты</a>
        <a class="chip" href="/r/${h(token)}/calendar.ics">${icon('plus', 16)} В календарь</a>
      </div>
    </section>

    <section class="card ${answered ? `sel-${guest.rsvp}` : ''}">
      ${answerBlock}
      ${answered ? '<p class="change">Планы изменились? Можно поменять ответ:</p>' : '<p class="q">Вы придёте?</p>'}
      <form method="post" action="/r/${h(token)}" class="btns">
        <button class="btn yes" name="answer" value="yes">${icon('check', 20)} Приду</button>
        <button class="btn no" name="answer" value="no">${icon('close', 20)} Не смогу прийти</button>
      </form>
    </section>

    <div class="foot">
      Устанавливать приложение не нужно.<br>
      ${optedOut
        ? 'Вы отказались от сообщений ToyTime — напоминаний больше не будет.'
        : `<form method="post" action="/r/${h(token)}/optout" style="display:inline"><button class="linkbtn">Не присылать мне напоминания</button></form>`}
      <br><a href="/privacy">Конфиденциальность</a> · ToyTime — без рекламы
    </div>
  `);
}

export function notFoundPage() {
  return layout('Ссылка недействительна', `
    ${hero({ title: 'Ссылка недействительна' })}
    <section class="card"><p class="invite">Проверьте ссылку из приглашения или свяжитесь с организатором праздника.</p></section>`);
}

export function testCheckoutPage({ payment, event }) {
  return layout('Тестовая оплата', `
    ${hero({ tag: 'ОПЛАТА · ТЕСТ', kicker: 'Оплата мероприятия', title: event.title })}
    <section class="card">
      <div class="banner" style="margin:0 0 16px">${icon('flask')} Тестовая страница: деньги не списываются, реальный платёжный провайдер не подключён.</div>
      <div style="margin-bottom:16px">
        <div style="color:var(--muted);font-size:12px">Стоимость одного мероприятия</div>
        <div class="price">${payment.amount_kzt.toLocaleString('ru-RU')} ₸ <small style="font-size:13px;font-weight:600;color:var(--muted);letter-spacing:0">/ мероприятие</small></div>
      </div>
      ${payment.status === 'pending' ? `
      <form method="post" class="btns">
        <button class="btn primary" name="result" value="paid">${icon('check', 20)} Тест: оплата прошла</button>
        <button class="btn no" name="result" value="failed">${icon('close', 20)} Тест: оплата отклонена</button>
      </form>` : `<div class="answer ${payment.status === 'paid' ? 'yes-a' : 'no-a'}"><div class="big">${icon(payment.status === 'paid' ? 'check' : 'close', 24)}</div>
        <div><b>${payment.status === 'paid' ? 'Оплата подтверждена' : 'Оплата отклонена'}</b><span>Вернитесь в приложение ToyTime.</span></div></div>`}
      <p class="foot" style="padding:14px 0 0">${icon('shield', 14)} Статус «оплачено» ставит только сервер — после подписанного уведомления от провайдера.</p>
    </section>`);
}

export function outboxPage(outbox) {
  const items = outbox.slice().reverse().map((m) => `
    <div class="card" style="margin:0 0 12px"><div class="meta">${h(new Date(m.sentAt).toLocaleString('ru-RU'))} → ${h(m.to)} · шаблон ${h(m.template)}</div>
    <div class="preview"><div class="msg">${h(m.preview).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</div></div></div>`).join('');
  return layout('Тестовые сообщения WhatsApp', `
    ${hero({ tag: 'ЭМУЛЯТОР', title: 'Тестовые сообщения WhatsApp' })}
    <div class="plain">
      <div class="banner" style="margin:0 0 16px">${icon('flask')} Эмулятор WhatsApp: эти сообщения никуда не отправлялись. Ссылки в них — настоящие ссылки гостей.</div>
      ${items || '<div class="card">Пока пусто. Отправьте приглашения из приложения.</div>'}
    </div>`);
}

export function privacyPage() {
  return layout('Политика конфиденциальности', `${hero({ title: 'Конфиденциальность' })}<div class="plain"><div class="card">
    <h1>Политика конфиденциальности (черновик)</h1>
    <p class="meta">Черновик для MVP. Перед запуском его должен проверить юрист на соответствие Закону РК «О персональных данных и их защите».</p>
    <p class="invite"><b>Какие данные мы обрабатываем.</b> Имя организатора (по желанию), данные мероприятия, имена и номера телефонов гостей, которых организатор сам выбрал или ввёл, ответы гостей и статусы доставки сообщений.</p>
    <p class="invite"><b>Контакты телефона.</b> Приложение читает контакты только после вашего явного разрешения и только на вашем устройстве. На сервер передаются лишь те контакты, которых вы выбрали гостями, и только имя и номер.</p>
    <p class="invite"><b>Зачем.</b> Чтобы отправить гостям приглашение и напоминания через WhatsApp и показать организатору их ответы. Рекламы нет, данные не передаются третьим лицам, кроме WhatsApp (Meta) для доставки сообщений и платёжного провайдера для оплаты.</p>
    <p class="invite"><b>Отзыв согласия.</b> Организатор может в настройках приложения отозвать согласие: аккаунт, мероприятия и данные гостей удаляются с сервера. Гость может отказаться от сообщений по ссылке в приглашении или ответив «СТОП» в WhatsApp.</p>
  </div></div>`);
}

// Файл календаря (.ics), чтобы гость добавил той в свой календарь.
export function calendarFile({ event, publicUrl, token }) {
  const start = new Date(event.starts_at);
  const end = new Date(start.getTime() + 4 * 3600 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ToyTime//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${token}@toytime`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`, `LOCATION:${esc(event.address)}`, `DESCRIPTION:${esc(event.invitation_text)}\\n\\n${publicUrl}/r/${token}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
