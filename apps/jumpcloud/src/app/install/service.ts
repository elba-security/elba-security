import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

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
