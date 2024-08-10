import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/users';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiKey,
  region,
}: SetupOrganisationParams) => {
  const encodedApiKey = await encrypt(apiKey);

  await getUsers({ apiKey, after: null, role: 'admin' });

  await db
    .insert(Organisation)
    .values({ id: organisationId, region, apiKey: encodedApiKey })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        apiKey: encodedApiKey,
      },
    });

  await inngest.send([
    {
      name: 'jumpcloud/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        role: 'admin',
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'jumpcloud/jumpcloud.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
