import { Elba } from '@elba-security/sdk';
import { env } from '@/common/env';

export const createElbaClient = ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) =>
  new Elba({
    accessId: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    organisationId,
    region,
  });
