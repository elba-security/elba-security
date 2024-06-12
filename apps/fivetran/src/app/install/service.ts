import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/users';
import { encrypt } from '@/common/crypto';

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
  const encryptedApiKey = await encrypt(apiKey);
  const encryptedApiSecret = await encrypt(apiSecret);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
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
