import { Elba } from '@elba-security/sdk';
import { env } from '../env';

export const elbaAccess = (organisationId: string) => {
  return new Elba({
    baseUrl: env.ELBA_API_BASE_URL,
    sourceId: env.ELBA_SOURCE_ID,
    apiKey: env.ELBA_API_KEY,
    organisationId,
  });
};
