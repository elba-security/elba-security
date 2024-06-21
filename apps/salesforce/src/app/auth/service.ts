import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/salesforce/auth';
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
  const { accessToken, refreshToken, instanceUrl, expiresAt } = await getToken(code);

  const encryptedAccessToken = await encrypt(accessToken);
  const encryptedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      instanceUrl,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
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
    {
      name: 'salesforce/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: expiresAt * 1000,
      },
    },
  ]);
};
