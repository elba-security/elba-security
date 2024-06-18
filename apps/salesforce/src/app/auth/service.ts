import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getUsers } from '@/connectors/salesforce/users';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  accessToken: string;
  instanceUrl: string;
  organisationId: string;
  region: string;
};

export const setupOrganisation = async ({
  accessToken,
  instanceUrl,
  organisationId,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ accessToken, instanceUrl, offset: 0 });

  const encodedAccessToken = await encrypt(accessToken);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      instanceUrl,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encodedAccessToken,
        instanceUrl,
        region,
      },
    });

  await inngest.send([
    {
      name: 'salesforce/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    {
      name: 'salesforce/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
