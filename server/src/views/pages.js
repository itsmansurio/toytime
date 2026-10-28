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

// Казахский орнамент «қошқар мүйіз» (бараний рог), упрощённый, для праздничной рамки.
const ORNAMENT = `<svg class="orn" viewBox="0 0 120 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
<path d="M2 12h28"/><path d="M90 12h28"/>
<path d="M60 4c-6 0-9 4-9 8s3 6 6 6 4-2 4-4-2-3-3-3"/><path d="M60 4c6 0 9 4 9 8s-3 6-6 6-4-2-4-4 2-3 3-3"/>
<path d="M34 12c0-4 3-6 6-6s5 2 5 5-2 4-4 4"/><path d="M86 12c0-4-3-6-6-6s-5 2-5 5 2 4 4 4"/>
<circle cx="60" cy="21" r="1.4" fill="currentColor"/></g></svg>`;

const STYLE = `
  :root { --green:#0F5C3A; --green-dark:#0A3F28; --green-light:#E7F2EB; --gold:#C9A24B; --gold-light:#F7EED8;
          --text:#16231D; --soft:#3B4A43; --muted:#7A8A82; --red:#C2412D; --red-light:#FBEAE6; --bg:#F3F1EA; --border:#E3E9E5; }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin:0; font-family: Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); }
  main { max-width: 480px; margin: 0 auto; padding: 0 0 40px; }
  a { color: var(--green); }
  .hero { position: relative; background: radial-gradient(120% 90% at 80% 0%, #1A7A50 0%, var(--green) 45%, var(--green-dark) 100%); color: #fff;
          padding: 28px 24px 70px; text-align: center; overflow: hidden; }
  .hero::before, .hero::after { content:""; position:absolute; width:260px; height:260px; border-radius:50%; background:#fff; opacity:.06; }
  .hero::before { top:-120px; right:-90px; } .hero::after { bottom:-160px; left:-120px; }
  .brand { display:inline-flex; align-items:center; gap:8px; font-weight:800; font-size:15px; letter-spacing:.5px; color:#CFE6D8; }
  .bell { width:28px; height:28px; border-radius:50%; background:#fff; display:grid; place-items:center; border:2px solid var(--gold); }
  .kicker { margin-top: 26px; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); font-weight: 700; }
  .title { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 700; font-size: 40px; line-height: 1.08; margin: 10px 0 6px; }
  .orn { width: 150px; color: var(--gold); margin: 6px auto 0; display:block; }
  .card { position: relative; background:#fff; border-radius: 24px; margin: -44px 16px 16px; padding: 22px 20px; box-shadow: 0 10px 30px rgba(11,46,30,.10); }
  .card + .card { margin-top: 0; }
  .greet { font-size: 17px; font-weight: 700; margin: 0 0 4px; }
  .invite { white-space: pre-wrap; color: var(--soft); line-height: 1.55; font-size: 15px; margin: 6px 0 0; }
  .facts { display:grid; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 1px dashed var(--border); }
  .fact { display:flex; gap: 12px; align-items:flex-start; }
  .fact .ic { flex: none; width: 40px; height: 40px; border-radius: 12px; background: var(--green-light); color: var(--green); display:grid; place-items:center; }
  .fact b { display:block; font-size: 15px; } .fact span { color: var(--muted); font-size: 13px; }
  .chips { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .chip { display:inline-flex; align-items:center; gap:6px; padding: 9px 14px; border-radius: 999px; background: var(--green-light); color: var(--green);
          font-weight: 700; font-size: 13px; text-decoration: none; }
  .q { text-align:center; font-weight: 800; font-size: 19px; margin: 2px 0 14px; }
  .btns { display:grid; gap: 10px; }
  button { font-family: inherit; cursor: pointer; }
  .btn { width:100%; border:0; border-radius: 16px; padding: 17px; font-size: 17px; font-weight: 800; display:flex; align-items:center; justify-content:center; gap:10px;
         transition: transform .08s ease; }
  .btn:active { transform: scale(.98); }
  .yes { background: var(--green); color:#fff; box-shadow: 0 8px 18px rgba(15,92,58,.25); }
  .no { background:#fff; color: var(--red); border: 2px solid #EBC3BB; }
  .sel-yes .yes { outline: 3px solid var(--gold); outline-offset: 2px; }
  .sel-no .no { background: var(--red-light); }
  .answer { display:flex; gap: 14px; align-items:center; border-radius: 18px; padding: 16px; margin-bottom: 14px; }
  .answer.yes-a { background: var(--green-light); } .answer.no-a { background: var(--red-light); }
  .answer .big { flex:none; width: 48px; height: 48px; border-radius: 50%; display:grid; place-items:center; color:#fff; }
  .yes-a .big { background: var(--green); } .no-a .big { background: var(--red); }
  .answer b { display:block; font-size: 16px; } .answer span { font-size: 13px; color: var(--soft); }
  .change { text-align:center; color: var(--muted); font-size: 13px; margin: 0 0 10px; }
  .foot { text-align:center; color: var(--muted); font-size: 12px; padding: 4px 24px; line-height: 1.6; }
  .linkbtn { background:none; border:0; color: var(--muted); text-decoration: underline; font-size: 13px; padding: 6px; }
  .banner { display:flex; gap:10px; align-items:center; background:#FDF3E1; color:#7A5410; border-radius: 14px; padding: 12px 14px; font-size: 13px; margin: 0 16px 14px; }
  .plain { padding: 24px 16px; }
  .plain .card { margin: 0 0 16px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  .price { font-size: 44px; font-weight: 800; color: var(--green); margin: 8px 0 4px; }
  .msg { white-space: pre-wrap; background: #DCF8C6; border-radius: 4px 14px 14px 14px; padding: 12px 14px; font-size: 14px; line-height: 1.5; }
  .meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
  .wa-bg { background: #ECE5DD; }
`;

function layout(title, body, { bodyClass = '' } = {}) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0F5C3A">
<title>${h(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
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
    <section class="hero">
      <div class="brand"><span class="bell"><svg width="15" height="15" viewBox="0 0 24 24" fill="#0F5C3A"><path d="M12 3a1.6 1.6 0 0 0-1.6 1.6v.5A7 7 0 0 0 5 12v3l-1.8 2.4c-.3.4 0 1 .5 1h16.6c.5 0 .8-.6.5-1L19 15v-3a7 7 0 0 0-5.4-6.9v-.5A1.6 1.6 0 0 0 12 3Zm-2.6 16.6a2.6 2.6 0 0 0 5.2 0Z"/></svg></span>ToyTime</div>
      <div class="kicker">Приглашение</div>
      <div class="title">${h(event.title)}</div>
      ${ORNAMENT}
    </section>

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
    <section class="hero" style="padding-bottom:60px"><div class="brand">ToyTime</div><div class="title" style="font-size:30px;margin-top:24px">Ссылка недействительна</div>${ORNAMENT}</section>
    <section class="card"><p class="invite">Проверьте ссылку из приглашения или свяжитесь с организатором праздника.</p></section>`);
}

export function testCheckoutPage({ payment, event }) {
  return layout('Тестовая оплата', `
    <section class="hero" style="padding-bottom:60px"><div class="brand">ToyTime · оплата</div><div class="title" style="font-size:30px;margin-top:24px">${h(event.title)}</div>${ORNAMENT}</section>
    <section class="card">
      <div class="banner" style="margin:0 0 16px">${icon('flask')} Тестовая страница: деньги не списываются, реальный платёжный провайдер не подключён.</div>
      <div style="text-align:center">
        <div style="color:var(--muted);font-size:14px">К оплате</div>
        <div class="price">${payment.amount_kzt.toLocaleString('ru-RU')} ₸</div>
        <div style="color:var(--muted);font-size:13px;margin-bottom:18px">Одна цена за мероприятие</div>
      </div>
      ${payment.status === 'pending' ? `
      <form method="post" class="btns">
        <button class="btn yes" name="result" value="paid">${icon('check', 20)} Тест: оплата прошла</button>
        <button class="btn no" name="result" value="failed">${icon('close', 20)} Тест: оплата отклонена</button>
      </form>` : `<div class="answer ${payment.status === 'paid' ? 'yes-a' : 'no-a'}"><div class="big">${icon(payment.status === 'paid' ? 'check' : 'close', 24)}</div>
        <div><b>${payment.status === 'paid' ? 'Оплата подтверждена' : 'Оплата отклонена'}</b><span>Вернитесь в приложение ToyTime.</span></div></div>`}
      <p class="foot" style="padding:14px 0 0">${icon('shield', 14)} Статус «оплачено» ставит только сервер — после подписанного уведомления от провайдера.</p>
    </section>`);
}

export function outboxPage(outbox) {
  const items = outbox.slice().reverse().map((m) => `
    <div class="card" style="margin:0 0 12px"><div class="meta">${h(new Date(m.sentAt).toLocaleString('ru-RU'))} → ${h(m.to)} · шаблон ${h(m.template)}</div>
    <div class="msg">${h(m.preview).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</div></div>`).join('');
  return layout('Тестовые сообщения WhatsApp', `
    <div class="plain">
      <div class="banner" style="margin:0 0 16px">${icon('flask')} Эмулятор WhatsApp: эти сообщения никуда не отправлялись. Ссылки в них — настоящие ссылки гостей.</div>
      ${items || '<div class="card">Пока пусто. Отправьте приглашения из приложения.</div>'}
    </div>`, { bodyClass: 'wa-bg' });
}

export function privacyPage() {
  return layout('Политика конфиденциальности', `<div class="plain"><div class="card">
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
