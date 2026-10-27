import { hmac, safeEqual, randomToken } from '../util.js';
import { renderPreview } from './whatsapp-templates.js';

export class WhatsAppError extends Error {
  // retryable: запрос точно не дошёл до получателя, повтор безопасен.
  // ambiguous: неизвестно, ушло ли сообщение. Автоповтора нет, чтобы не было дублей.
  constructor(message, { retryable = false, ambiguous = false, code } = {}) {
    super(message);
    this.retryable = retryable;
    this.ambiguous = ambiguous;
    this.code = code;
  }
}

// Реальный клиент WhatsApp Cloud API (официальная WhatsApp Business Platform).
// Не проверен на живом аккаунте: нужен номер, токен и одобренные шаблоны.
export function createCloudApiClient(config) {
  const { apiVersion, phoneNumberId, accessToken } = config.whatsapp;
  return {
    testMode: false,
    async sendTemplate(msg) {
      const body = {
        messaging_product: 'whatsapp',
        to: msg.to.replace('+', ''),
        type: 'template',
        template: {
          name: msg.template,
          language: { code: msg.language },
          components: [
            { type: 'body', parameters: msg.bodyParams.map((text) => ({ type: 'text', text })) },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: msg.buttonUrlSuffix }] },
          ],
        },
      };
      let res;
      try {
        res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
      } catch (err) {
        // Соединение не установлено: запрос точно не ушёл. Таймаут: исход неизвестен.
        const refused = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(err.cause?.code);
        throw new WhatsAppError(`Сетевая ошибка: ${err.message}`, { retryable: refused, ambiguous: !refused });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = json?.error?.code;
        const retryable = res.status === 429 || res.status >= 500 || [130429, 131016, 131056].includes(code);
        throw new WhatsAppError(`HTTP ${res.status}: ${json?.error?.message || 'ошибка API'}`, { retryable, code });
      }
      const id = json?.messages?.[0]?.id;
      if (!id) throw new WhatsAppError('Ответ API без id сообщения', { ambiguous: true });
      return { providerMessageId: id };
    },
  };
}

// Эмулятор WhatsApp для тестового режима. Ничего не отправляет наружу.
// Специальные номера для проверки ошибок:
//   оканчивается на 0001 — временная ошибка (повторяется),
//   на 0002 — постоянная ошибка (номер не в WhatsApp),
//   на 0003 — таймаут с неизвестным исходом.
export function createEmulator(config) {
  const outbox = [];
  const pendingStatuses = [];
  return {
    testMode: true,
    outbox,
    async sendTemplate(msg) {
      if (msg.to.endsWith('0001')) throw new WhatsAppError('Эмулятор: временная ошибка 503', { retryable: true, code: 131016 });
      if (msg.to.endsWith('0002')) throw new WhatsAppError('Эмулятор: номер не зарегистрирован в WhatsApp', { code: 131026 });
      if (msg.to.endsWith('0003')) throw new WhatsAppError('Эмулятор: таймаут, исход неизвестен', { ambiguous: true });
      const providerMessageId = 'wamid.TEST_' + randomToken(12);
      outbox.push({ ...msg, providerMessageId, sentAt: new Date().toISOString(), preview: renderPreview(msg, config.publicUrl) });
      pendingStatuses.push({ id: providerMessageId, status: 'delivered', recipient_id: msg.to.replace('+', '') });
      return { providerMessageId };
    },
    // Формирует вебхук в формате Meta о доставке всех отправленных сообщений.
    takeStatusWebhook() {
      if (!pendingStatuses.length) return null;
      const statuses = pendingStatuses.splice(0).map((s) => ({ ...s, timestamp: String(Math.floor(Date.now() / 1000)) }));
      return webhookPayload({ statuses });
    },
    inboundTextWebhook(fromPhone, text) {
      return webhookPayload({
        messages: [{ from: fromPhone.replace('+', ''), id: 'wamid.IN_' + randomToken(12), timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
      });
    },
  };
}

function webhookPayload(value) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'TEST_WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', ...value } }] }],
  };
}

export function signWebhook(appSecret, rawBody) {
  return 'sha256=' + hmac(appSecret, rawBody).toString('hex');
}

export function verifyWebhookSignature(appSecret, rawBody, header) {
  if (!header || !rawBody) return false;
  return safeEqual(signWebhook(appSecret, rawBody), header);
}
