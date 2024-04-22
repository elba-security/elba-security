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
  const encodedapiKey = await encrypt(apiKey);

  await getUsers({ apiKey });

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
        region,
      },
    },
  ]);
};
