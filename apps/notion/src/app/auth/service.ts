import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/notion/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken } = await getToken(code);

  const encodedAccessToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encodedAccessToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'notion/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'notion/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
