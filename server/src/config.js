// Все внешние интеграции по умолчанию работают в тестовом режиме.
// Реальный режим включается только явной переменной окружения и требует ключей.
const env = process.env;

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

export function loadConfig(overrides = {}) {
  const config = {
    port: Number(env.PORT || 3000),
    databaseUrl: env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/toytime',
    publicUrl: (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, ''),
    // Секрет для подписи ссылок гостей и хэширования телефонов.
    linkSecret: env.LINK_SECRET || 'dev-only-secret-change-me',
    corsOrigin: env.CORS_ORIGIN || '',
    adminToken: env.ADMIN_TOKEN || 'dev-admin',
    priceKzt: 1000,
    utcOffset: '+05:00', // Казахстан, единый часовой пояс с 2024 года
    consentVersion: '2026-10',
    whatsapp: {
      testMode: bool(env.WHATSAPP_TEST_MODE, true),
      apiVersion: env.WHATSAPP_API_VERSION || 'v21.0',
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: env.WHATSAPP_ACCESS_TOKEN || '',
      appSecret: env.WHATSAPP_APP_SECRET || 'dev-app-secret',
      verifyToken: env.WHATSAPP_VERIFY_TOKEN || 'dev-verify-token',
      maxAttempts: 5,
    },
    payments: {
      testMode: bool(env.PAYMENTS_TEST_MODE, true),
      provider: env.PAYMENTS_PROVIDER || 'test',
      webhookSecret: env.PAYMENTS_WEBHOOK_SECRET || 'dev-payment-secret',
    },
    push: {
      testMode: bool(env.PUSH_TEST_MODE, true),
    },
    ...overrides,
  };
  if (!config.whatsapp.testMode && (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken || !env.WHATSAPP_APP_SECRET)) {
    throw new Error('WHATSAPP_TEST_MODE=false требует WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN и WHATSAPP_APP_SECRET');
  }
  if (!config.payments.testMode) {
    throw new Error('Реальный платёжный провайдер ещё не подключён: оставьте PAYMENTS_TEST_MODE=true');
  }
  return config;
}
