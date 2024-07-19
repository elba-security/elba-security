import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/doppler/users';

type SetupOrganisationParams = {
  organisationId: string;
  apiToken: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiToken,
  region,
}: SetupOrganisationParams) => {
  const encodedApiToken = await encrypt(apiToken);

  await getUsers({ apiToken });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiToken: encodedApiToken,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiToken: encodedApiToken,
      },
    });

  await inngest.send([
    {
      name: 'doppler/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'doppler/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
