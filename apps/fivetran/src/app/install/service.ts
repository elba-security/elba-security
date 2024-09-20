import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getAuthUser } from '@/connectors/fivetran/users';
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
  const { authUserId } = await getAuthUser({ apiKey, apiSecret });

  const encryptedApiKey = await encrypt(apiKey);
  const encryptedApiSecret = await encrypt(apiSecret);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      region,
      authUserId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        authUserId,
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
    {
      name: 'fivetran/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
