import { Elba } from '@elba-security/sdk';
import { env } from '@/common/env/server';

export const createElbaClient = ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) => {
  return new Elba({
    organisationId,
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    region,
  });
};
