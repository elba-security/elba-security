import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAllUsers } from '@/connectors/users';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  apiKey: string;
};

export const registerOrganisation = async ({
  organisationId,
  region,
  apiKey,
}: SetupOrganisationParams) => {
  const encodedapiKey = await encrypt(apiKey);

  await getAllUsers({ apiKey });

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      region,
      apiKey: encodedapiKey,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        apiKey: encodedapiKey,
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
    // this will cancel scheduled token refresh if it exists
    {
      name: 'statsig/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
