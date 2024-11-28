import { NangoAPIClient } from '@elba-security/nango';
import { env } from '../env/server';

export const nangoAPIClient = new NangoAPIClient({
  integrationId: env.NEXT_PUBLIC_NANGO_INTEGRATION_ID,
  secretKey: env.NANGO_SECRET_KEY,
});
