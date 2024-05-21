import { Elba } from '@elba-security/sdk';
import { env } from '@/env';

export const createElbaClient = (organisationId: string, region: string) => {
  return new Elba({
    baseUrl: env.ELBA_API_BASE_URL,
    apiKey: env.ELBA_API_KEY,
    organisationId,
    region,
  });
};
