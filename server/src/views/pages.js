import { escapeHtml as h, formatDate } from '../util.js';
import { formatPhone } from '../integrations/whatsapp-templates.js';

const WEEKDAYS = {
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  kk: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
};

// Тексты страницы гостя на языке приглашения.
const GUEST_TEXT = {
  en: {
    tag: 'INVITATION', invites: (n) => `${n} invites you`, invitedDefault: 'You are invited to a celebration',
    start: 'start', place: 'venue', host: 'host phone', call: 'Call', calendar: 'Add to calendar', maps: 'Google Maps',
    yesTitle: 'You’re coming — thank you!', yesText: 'The host can already see your reply. See you at the celebration!',
    noTitle: 'Sorry you can’t make it', noText: 'Thanks for letting us know — the host will see your reply.',
    change: 'Plans changed? You can update your reply:', question: 'Will you come?', yes: 'Coming', no: 'Can’t come',
    noApp: 'No app to install.', optedOut: 'You’ve opted out of ToiTime messages — no more reminders.',
    optOut: 'Don’t send me reminders', privacy: 'Privacy', noAds: 'ToiTime — no ads', video: 'Video invitation', photo: 'Photo invitation',
    greet: 'Dear',
  },
  ru: {
    tag: 'ПРИГЛАШЕНИЕ', invites: (n) => `${n} приглашает вас`, invitedDefault: 'Вас приглашают на праздник',
    start: 'начало', place: 'место проведения', host: 'телефон хозяина', call: 'Позвонить', calendar: 'В календарь', maps: 'Google Карты',
    yesTitle: 'Вы придёте — спасибо!', yesText: 'Организатор уже видит ваш ответ. До встречи на празднике!',
    noTitle: 'Жаль, что не получится', noText: 'Спасибо, что предупредили — организатор увидит ваш ответ.',
    change: 'Планы изменились? Можно поменять ответ:', question: 'Вы придёте?', yes: 'Приду', no: 'Не смогу прийти',
    noApp: 'Устанавливать приложение не нужно.', optedOut: 'Вы отказались от сообщений ToiTime — напоминаний больше не будет.',
    optOut: 'Не присылать мне напоминания', privacy: 'Конфиденциальность', noAds: 'ToiTime — без рекламы', video: 'Видео-приглашение', photo: 'Фото-приглашение',
  },
  kk: {
    tag: 'ШАҚЫРУ', invites: (n) => `${n} сізді шақырады`, invitedDefault: 'Сізді мерекеге шақырады',
    start: 'басталуы', place: 'өтетін орны', host: 'той иесінің телефоны', call: 'Қоңырау шалу', calendar: 'Күнтізбеге қосу', maps: 'Google Карта',
    yesTitle: 'Келетініңізге рахмет!', yesText: 'Той иесі жауабыңызды көріп тұр. Тойда кездескенше!',
    noTitle: 'Өкінішті, келе алмайды екенсіз', noText: 'Ескерткеніңізге рахмет — той иесі жауабыңызды көреді.',
    change: 'Жоспарыңыз өзгерді ме? Жауапты өзгертуге болады:', question: 'Келесіз бе?', yes: 'Барамын', no: 'Бара алмаймын',
    noApp: 'Қосымшаны орнатудың қажеті жоқ.', optedOut: 'Сіз ToiTime хабарламаларынан бас тарттыңыз — еске салғыштар енді келмейді.',
    optOut: 'Маған еске салғыш жібермеңіз', privacy: 'Құпиялылық', noAds: 'ToiTime — жарнамасыз', video: 'Бейне-шақыру', photo: 'Фото-шақыру',
  },
};

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
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/>',
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

// Стиль по макету заказчика: тёмно-зелёная шапка со скруглением, салатовый акцент.
// Две темы (по настройке телефона), контраст текста WCAG AAA.
const STYLE = `
  :root { color-scheme: light dark;
          --bg:#f5f7f4; --card:#fff; --text:#17231f; --soft:#2f3b35; --muted:#4a5650; --line:#e2e8e3;
          --accent:#123c32; --header:#123c32; --header-sub:#d5e4dd; --lime:#d8f27b; --on-lime:#123c32;
          --chip:#edf2ee; --green-light:#eaf2e9; --red:#8a2720; --red-light:#ffebe8; --yes:#1a5230; --yes-light:#e3f5e8;
          --notice:#3a4a22; --notice-bg:#f1f6e6; --primary:#123c32; --on-primary:#fff; --msg:#fff; --preview:#e6f0e7;
          --shadow: 0 6px 20px rgba(23,35,31,.06); }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0c1411; --card:#141f1b; --text:#f1f5f2; --soft:#d6e0da; --muted:#b4c1ba; --line:#24332d;
            --accent:#d8f27b; --header:#0f2a22; --header-sub:#c9d9d1; --chip:#1b2924; --green-light:#1e2e28;
            --red:#ffbdb5; --red-light:#3a1b18; --yes:#9be8b3; --yes-light:#123020; --notice:#dcebb8; --notice-bg:#1b2616;
            --primary:#d8f27b; --on-primary:#10251d; --msg:#1a2723; --preview:#1e2e28; --shadow: 0 6px 24px rgba(0,0,0,.35); }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin:0; font: 15px/1.45 Inter, -apple-system, "SF Pro Text", BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: var(--bg); color: var(--text); }
  main { max-width: 500px; margin: 0 auto; padding: 0 0 36px; }
  a { color: var(--accent); }
  :focus-visible { outline: 3px solid var(--lime); outline-offset: 2px; }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: no-preference) { .card { animation: rise .32s ease-out both; } .card + .card { animation-delay: .06s; } }
  .hero { background: var(--header); color:#fff; padding: 22px 19px 26px; border-radius: 0 0 25px 25px; }
  .topline { display:flex; justify-content:space-between; align-items:center; }
  .brand { font-size: 23px; font-weight: 800; letter-spacing: -.8px; color:#fff; }
  .brand span { color: #d8f27b; }
  .tag { font-size: 11px; border: 1px solid #ffffff44; border-radius: 20px; padding: 6px 9px; color: #e3eee8; }
  .kicker { margin-top: 24px; font-size: 13px; color: #d8f27b; font-weight: 700; }
  .title { font-size: 27px; line-height: 1.12; font-weight: 800; margin: 6px 0 8px; letter-spacing: -.7px; }
  .sub { color: var(--header-sub); font-size: 13px; margin: 0; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; margin: 0 16px 12px; padding: 16px; box-shadow: var(--shadow); }
  .hero + .card, .hero + .banner { margin-top: 16px; }
  .greet { font-size: 17px; font-weight: 800; margin: 0 0 4px; letter-spacing: -.3px; }
  .invite { white-space: pre-wrap; color: var(--soft); line-height: 1.5; font-size: 15px; margin: 6px 0 0; }
  .facts { display:grid; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
  .fact { display:flex; gap: 11px; align-items:center; }
  .fact .ic { flex: none; width: 40px; height: 40px; border-radius: 14px; background: var(--green-light); color: var(--accent); display:grid; place-items:center; }
  .fact b { display:block; font-size: 14px; } .fact span { color: var(--muted); font-size: 12px; }
  .chips { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .chip { display:inline-flex; align-items:center; gap:6px; padding: 9px 12px; border-radius: 12px; background: var(--chip); color: var(--accent);
          font-weight: 700; font-size: 13px; text-decoration: none; transition: transform .15s ease; }
  .chip:active { transform: scale(.96); }
  .q { font-weight: 800; font-size: 18px; margin: 0 0 12px; letter-spacing: -.3px; }
  .btns { display:grid; gap: 8px; }
  button { font-family: inherit; cursor: pointer; }
  .btn { width:100%; border:0; border-radius: 14px; padding: 15px; font-size: 16px; font-weight: 700; display:flex; align-items:center; justify-content:center; gap:8px;
         transition: transform .12s ease, box-shadow .2s ease; }
  .btn:active { transform: scale(.98); }
  .yes { background: var(--lime); color: var(--on-lime); }
  .no { background: var(--card); color: var(--accent); border: 1px solid var(--line); }
  .primary { background: var(--primary); color: var(--on-primary); }
  .sel-yes .yes { box-shadow: 0 0 0 3px #1d6a5455; }
  .sel-no .no { background: var(--red-light); color: var(--red); border-color: var(--red-light); }
  .answer { display:flex; gap: 12px; align-items:center; border-radius: 14px; padding: 12px; margin-bottom: 12px; }
  .answer.yes-a { background: var(--yes-light); } .answer.no-a { background: var(--red-light); }
  .answer .big { flex:none; width: 42px; height: 42px; border-radius: 14px; display:grid; place-items:center; color: var(--bg); }
  .yes-a .big { background: var(--yes); } .no-a .big { background: var(--red); }
  .answer b { display:block; font-size: 15px; } .answer span { font-size: 12px; color: var(--soft); }
  .change { color: var(--muted); font-size: 12px; margin: 0 0 10px; }
  .foot { text-align:center; color: var(--muted); font-size: 12px; padding: 6px 24px; line-height: 1.6; }
  .linkbtn { background:none; border:0; color: var(--muted); text-decoration: underline; font-size: 12px; padding: 6px; }
  .banner { display:flex; gap:8px; align-items:center; background: var(--notice-bg); color: var(--notice); border-radius: 14px; padding: 12px; font-size: 12px; margin: 0 16px 12px; }
  .plain { padding: 16px; }
  .plain .card { margin: 0 0 12px; }
  h1 { font-size: 20px; margin: 0 0 12px; letter-spacing: -.3px; }
  .price { font-size: 29px; font-weight: 800; letter-spacing: -1px; margin: 4px 0; }
  .msg { white-space: pre-wrap; background: var(--msg); border-radius: 5px 15px 15px 15px; padding: 14px; font-size: 14px; line-height: 1.5; }
  .preview { background: var(--preview); border-radius: 16px; padding: 12px; }
  .media { padding: 0; overflow: hidden; }
  .media img, .media video { display: block; width: 100%; max-height: 70vh; object-fit: contain; background: #000; }
  .meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
`;

const hero = ({ tag, kicker, title, sub }) => `
    <section class="hero">
      <div class="topline"><div class="brand">Toi<span>Time</span></div>${tag ? `<div class="tag">${h(tag)}</div>` : ''}</div>
      ${kicker ? `<div class="kicker">${h(kicker)}</div>` : ''}
      <div class="title"${kicker ? '' : ' style="margin-top:22px"'}>${h(title)}</div>
      ${sub ? `<p class="sub">${h(sub)}</p>` : ''}
    </section>`;

function layout(title, body, { bodyClass = '', lang = 'ru' } = {}) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#123c32">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<title>${h(title)}</title>
<style>${STYLE}</style></head>
<body class="${bodyClass}"><main>${body}</main></body></html>`;
}

function weekday(isoDate, lang = 'ru') {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function rsvpPage({ guest, event, token, optedOut, flash }) {
  const lang = ['ru', 'kk', 'en'].includes(event.lang) ? event.lang : 'ru';
  const t = GUEST_TEXT[lang];
  const date = formatDate(event.event_date, lang);
  const answered = guest.rsvp !== 'pending';
  const mapQuery = encodeURIComponent(event.address);
  const answerBlock = answered ? (guest.rsvp === 'yes'
    ? `<div class="answer yes-a"><div class="big">${icon('check', 26)}</div><div><b>${t.yesTitle}</b><span>${t.yesText}</span></div></div>`
    : `<div class="answer no-a"><div class="big">${icon('close', 24)}</div><div><b>${t.noTitle}</b><span>${t.noText}</span></div></div>`)
    : '';
  const media = event.media;
  const mediaBlock = media
    ? `<section class="card media">${media.type === 'video'
      ? `<video src="${h(media.url)}" controls playsinline preload="metadata" aria-label="${t.video}"></video>`
      : `<img src="${h(media.url)}" alt="${t.photo}">`}</section>`
    : '';
  const phone = event.host_phone;
  const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

  return layout(event.title, `
    ${hero({ tag: t.tag, kicker: event.host_name ? t.invites(event.host_name) : t.invitedDefault, title: event.title, sub: `${date} · ${event.event_time}` })}

    ${flash ? `<div class="banner">${h(flash)}</div>` : ''}

    ${mediaBlock}

    <section class="card">
      <p class="greet">${t.greet ?? 'Құрметті'} ${h(guest.name)}!</p>
      <p class="invite">${h(event.invitation_text)}</p>
      <div class="facts">
        <div class="fact"><div class="ic">${icon('calendar', 20)}</div><div><b>${h(date)}</b><span>${h(weekday(event.event_date, lang))}</span></div></div>
        <div class="fact"><div class="ic">${icon('time', 20)}</div><div><b>${h(event.event_time)}</b><span>${t.start}</span></div></div>
        <div class="fact"><div class="ic">${icon('pin', 20)}</div><div><b>${h(event.address)}</b><span>${t.place}</span></div></div>
        ${phone ? `<div class="fact"><div class="ic">${icon('phone', 20)}</div><div><b>${h(formatPhone(phone))}</b><span>${t.host}</span></div></div>` : ''}
      </div>
      <div class="chips">
        <a class="chip" href="https://2gis.kz/search/${mapQuery}" target="_blank" rel="noopener">${icon('map', 16)} 2ГИС</a>
        <a class="chip" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" target="_blank" rel="noopener">${icon('pin', 16)} ${t.maps}</a>
        <a class="chip" href="/r/${h(token)}/calendar.ics">${icon('plus', 16)} ${t.calendar}</a>
        ${phone ? `<a class="chip" href="tel:${h(phone)}">${icon('phone', 16)} ${t.call}</a>
        <a class="chip" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      </div>
    </section>

    <section class="card ${answered ? `sel-${guest.rsvp}` : ''}">
      ${answerBlock}
      ${answered ? `<p class="change">${t.change}</p>` : `<p class="q">${t.question}</p>`}
      <form method="post" action="/r/${h(token)}" class="btns">
        <button class="btn yes" name="answer" value="yes">${icon('check', 20)} ${t.yes}</button>
        <button class="btn no" name="answer" value="no">${icon('close', 20)} ${t.no}</button>
      </form>
    </section>

    <div class="foot">
      ${t.noApp}<br>
      ${optedOut
        ? t.optedOut
        : `<form method="post" action="/r/${h(token)}/optout" style="display:inline"><button class="linkbtn">${t.optOut}</button></form>`}
      <br><a href="/privacy">${t.privacy}</a> · ${t.noAds}
    </div>
  `, { lang });
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
        <div><b>${payment.status === 'paid' ? 'Оплата подтверждена' : 'Оплата отклонена'}</b><span>Вернитесь в приложение ToiTime.</span></div></div>`}
      <p class="foot" style="padding:14px 0 0">${icon('shield', 14)} Статус «оплачено» ставит только сервер — после подписанного уведомления от провайдера.</p>
    </section>`);
}

export function outboxPage(outbox, { events = [], token = '', flash } = {}) {
  const items = outbox.slice().reverse().map((m) => `
    <div class="card" style="margin:0 0 12px"><div class="meta">${h(new Date(m.sentAt).toLocaleString('ru-RU'))} → ${h(m.to)} · шаблон ${h(m.template)}</div>
    <div class="preview"><div class="msg">${h(m.preview).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</div></div></div>`).join('');
  const kinds = (e) => [['reminder_first', `За ${e.first_reminder_days} дней`], ['reminder_3d', 'За 3 дня'], ['reminder_1d', 'За 1 день']];
  const reminders = events.length ? `
      <div class="card" style="margin:0 0 16px">
        <h1>Тест напоминаний</h1>
        <p class="meta">Обычно напоминание уходит в 9:00 по Астане в нужный день. Здесь его можно отправить сразу, по тем же правилам: гостям, ответившим «Приду», и тем, кто ещё не ответил. Каждое напоминание уходит гостю один раз.</p>
        ${flash !== undefined ? `<div class="banner" style="margin:0 0 12px">${icon('check')} Отправлено напоминаний: ${h(flash)}. Новые сообщения — ниже.</div>` : ''}
        ${events.map((e) => `
          <div style="margin-top:12px"><b>${h(e.title)}</b> <span class="meta">· ${h(e.event_date)}${e.reminders_enabled ? '' : ' · напоминания выключены'}</span>
          <div class="chips" style="margin-top:8px">${kinds(e).map(([k, label]) => `
            <form method="post" action="/test/reminders?token=${encodeURIComponent(token)}" style="display:inline">
              <input type="hidden" name="event_id" value="${h(e.id)}"><input type="hidden" name="kind" value="${k}">
              <button class="chip" style="border:0"${(e.sent_kinds ?? []).includes(k) ? ' disabled title="Уже отправлено"' : ''}>${icon('plus', 14)} ${h(label)}${(e.sent_kinds ?? []).includes(k) ? ' ✓' : ''}</button>
            </form>`).join('')}</div></div>`).join('')}
      </div>` : '';
  return layout('Тестовые сообщения WhatsApp', `
    ${hero({ tag: 'ЭМУЛЯТОР', title: 'Тестовые сообщения WhatsApp' })}
    <div class="plain">
      <div class="banner" style="margin:0 0 16px">${icon('flask')} Эмулятор WhatsApp: эти сообщения никуда не отправлялись. Ссылки в них — настоящие ссылки гостей.</div>
      ${reminders}
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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ToiTime//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${token}@toytime`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`, `LOCATION:${esc(event.address)}`, `DESCRIPTION:${esc(event.invitation_text)}\\n\\n${publicUrl}/r/${token}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
