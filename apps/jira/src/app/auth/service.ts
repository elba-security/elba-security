import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken, getCloudId } from '@/connectors/jira/auth';
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
  const { accessToken, refreshToken, expiresIn } = await getToken(code);
  const { cloudId } = await getCloudId(accessToken);

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      region,
      cloudId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        region,
        cloudId,
      },
    });

  await inngest.send([
    {
      name: 'jira/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'jira/app.installed',
      data: {
        organisationId,
        region,
      },
    },
    {
      name: 'jira/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
