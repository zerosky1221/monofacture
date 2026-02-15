export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  webappUrl: process.env.WEBAPP_URL || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    apiId: parseInt(process.env.TELEGRAM_API_ID || '0', 10),
    apiHash: process.env.TELEGRAM_API_HASH,
    sessionString: process.env.TELEGRAM_SESSION_STRING,
    useWebhook: process.env.TELEGRAM_USE_WEBHOOK === 'true',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    webhookSecretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || '',
  },

  ton: {
    network: process.env.TON_NETWORK || 'testnet',
    testnet: (process.env.TON_TESTNET || 'true') === 'true',
    endpoint: process.env.TON_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.TON_API_KEY || '',
    connectManifestUrl: process.env.TON_CONNECT_MANIFEST_URL,
    platformWalletAddress: process.env.TON_PLATFORM_WALLET_ADDRESS || process.env.PLATFORM_WALLET_ADDRESS || '',
    platformWalletMnemonic: process.env.PLATFORM_WALLET_MNEMONIC || process.env.TESTNET_MNEMONIC || '',
    escrowMasterSeed: process.env.ESCROW_MASTER_SEED || process.env.TESTNET_MNEMONIC || '',
  },

  platform: {
    feeRate: parseFloat(process.env.PLATFORM_FEE_RATE || '0.05'),
    defaultDealTimeoutHours: parseInt(process.env.DEFAULT_DEAL_TIMEOUT_HOURS || '24', 10),
    defaultPostDurationHours: parseInt(process.env.DEFAULT_POST_DURATION_HOURS || '24', 10),
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
});
