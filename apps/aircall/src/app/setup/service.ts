import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '../common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  // retrieve token from SaaS API using the given code
  const { accessToken } = await getToken(code);
  const encodedToken = await encrypt(accessToken);

  await db
    .insert(Organisation)
    .values({ id: organisationId, accessToken: encodedToken, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken: encodedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'aircall/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'aircall/aircall.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
