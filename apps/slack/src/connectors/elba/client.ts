import { Elba } from '@elba-security/sdk';
import { env } from '@/common/env';

export const createElbaClient = (organisationId: string, region: string) => {
  return new Elba({
    sourceId: env.ELBA_SOURCE_ID,
    apiKey: env.ELBA_API_KEY,
    organisationId,
    region,
  });
};
