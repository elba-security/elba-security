import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/statsig/users';

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

  await getUsers({ apiKey });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiKey: encodedApiKey,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encodedApiKey,
      },
    });

  await inngest.send([
    {
      name: 'statsig/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
      },
    },
    {
      name: 'statsig/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
