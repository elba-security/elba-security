import { Elba } from '@elba-security/sdk';
import { env } from '../env';

export const elbaAccess = ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) => {
  return new Elba({
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    organisationId,
    region,
    sourceId: env.ELBA_SOURCE_ID,
  });
};
