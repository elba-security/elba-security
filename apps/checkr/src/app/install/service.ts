import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/checkr/users';

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
  const encryptedServiceToken = await encrypt(apiKey);

  await getUsers({ apiKey, page: null });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiKey: encryptedServiceToken,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encryptedServiceToken,
      },
    });

  await inngest.send([
    {
      name: 'checkr/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'checkr/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
