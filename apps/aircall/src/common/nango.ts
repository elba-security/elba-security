import { NangoAPIClient } from '@elba-security/nango';
import { env } from './env';

export const nangoAPIClient = new NangoAPIClient({
  integrationId: env.NANGO_INTEGRATION_ID,
  secretKey: env.NANGO_SECRET_KEY,
});
