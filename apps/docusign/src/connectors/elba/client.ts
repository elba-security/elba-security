import { Elba } from '@elba-security/sdk';
import { env } from '@/common/env';

export const createElbaOrganisationClient = ({
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

export const createElbaGlobalClient = (region: string) => {
  return new Elba({
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    region,
  });
};
