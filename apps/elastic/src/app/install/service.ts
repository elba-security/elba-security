import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAccountId } from '@/connectors/users';

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

  const { accountId } = await getAccountId({ apiKey });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accountId,
      region,
      apiKey: encodedapiKey,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accountId,
        region,
        apiKey: encodedapiKey,
      },
    });

  await inngest.send([
    {
      name: 'elastic/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'elastic/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
