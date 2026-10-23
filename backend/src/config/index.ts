import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  encryptionKey: process.env.ENCRYPTION_KEY || 'auto-ads-care-secret-key-32chr!',
  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: process.env.META_APP_SECRET || '',
  metaApiVersion: process.env.META_API_VERSION || 'v22.0',
  metaRedirectUri: process.env.META_REDIRECT_URI || 'http://localhost:5000/api/auth/meta/callback',
  defaultUserEmail: process.env.DEFAULT_USER_EMAIL || 'admin@autoadscare.io',
  schedulerCron: process.env.SCHEDULER_CRON || '*/1 * * * *',
  emergencyStop: process.env.EMERGENCY_STOP === 'true',
  enableMockFallback: process.env.ENABLE_MOCK_FALLBACK !== 'false',
};
