import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/dbtlabs/users';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  serviceToken: string;
  accountId: string;
  accessUrl: string;
};

export const registerOrganisation = async ({
  organisationId,
  region,
  serviceToken,
  accountId,
  accessUrl,
}: SetupOrganisationParams) => {
  const encodedserviceToken = await encrypt(serviceToken);

  await getUsers({ serviceToken, accountId, accessUrl, page: null });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      accountId,
      serviceToken: encodedserviceToken,
      accessUrl,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accountId,
        region,
        serviceToken: encodedserviceToken,
      },
    });

  await inngest.send([
    {
      name: 'dbtlabs/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'dbtlabs/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
