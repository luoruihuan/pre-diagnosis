import { registerAs } from '@nestjs/config';

export default registerAs('oceanEngine', () => ({
  baseUrl: process.env.OCEAN_ENGINE_BASE_URL || 'https://api.oceanengine.com',
  appId: process.env.OCEAN_ENGINE_APP_ID,
  appSecret: process.env.OCEAN_ENGINE_APP_SECRET,
  webhookSecret: process.env.OCEAN_ENGINE_WEBHOOK_SECRET,
  redirectUri:
    process.env.OCEAN_ENGINE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/ocean-engine/callback',
  frontendCallback:
    process.env.OCEAN_ENGINE_FRONTEND_CALLBACK ||
    'http://localhost:5173/base/system',
}));
