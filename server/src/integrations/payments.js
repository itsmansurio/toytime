import { hmac, safeEqual, randomToken } from '../util.js';

// Эмулятор платёжного провайдера. Повторяет типичную схему казахстанских
// провайдеров (Kaspi Pay, CloudPayments, ioka, Freedom Pay): создаём платёж,
// пользователь платит на странице провайдера, провайдер присылает подписанный
// вебхук. Статус «оплачено» ставит только сервер после проверки вебхука.
export function createPaymentEmulator(config) {
  return {
    name: 'test',
    testMode: true,
    async createPayment({ paymentId, amountKzt, description }) {
      return {
        providerPaymentId: 'test_pay_' + randomToken(9),
        checkoutUrl: `${config.publicUrl}/test/pay/${paymentId}`,
        amountKzt,
        description,
      };
    },
    // То, что провайдер отправил бы на наш вебхук после оплаты.
    buildWebhook({ providerPaymentId, amountKzt, status }) {
      const body = JSON.stringify({ event_id: 'evt_' + randomToken(9), payment_id: providerPaymentId, status, amount: amountKzt, currency: 'KZT' });
      return { body, signature: signPaymentWebhook(config.payments.webhookSecret, body) };
    },
  };
}

export function signPaymentWebhook(secret, rawBody) {
  return hmac(secret, rawBody).toString('hex');
}

export function verifyPaymentWebhook(secret, rawBody, signature) {
  if (!signature || !rawBody) return false;
  return safeEqual(signPaymentWebhook(secret, rawBody), signature);
}
