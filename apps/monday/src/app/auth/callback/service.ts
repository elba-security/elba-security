import { db } from '@/database/client.node';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';

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
  const tokenResponse = await getToken(code);

  await db
    .insert(Organisation)
    .values({ id: organisationId, token: tokenResponse.access_token, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        token: tokenResponse.access_token,
      },
    });

  await inngest.send({
    name: 'monday/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: 1,
    },
  });
};
