import { NangoFrontend } from '@elba-security/nango';
import { env } from '../env/client';

export const nangoFrontend = new NangoFrontend({
  integrationId: env.NEXT_PUBLIC_NANGO_INTEGRATION_ID,
  publicKey: env.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
});
