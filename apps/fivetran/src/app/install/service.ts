import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/users';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  apiSecret: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiKey,
  apiSecret,
  region,
}: SetupOrganisationParams) => {
  
  await getUsers({ apiKey, apiSecret });

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      region,
      apiKey,
      apiSecret,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        apiKey,
        apiSecret,
      },
    });

  await inngest.send([
    {
      name: 'fivetran/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'fivetran/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
