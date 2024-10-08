import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken, getAuthUser } from '@/connectors/docusign/auth';
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
  const { authUserId, accountId, apiBaseUri } = await getAuthUser(accessToken);

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      authUserId,
      accountId,
      apiBaseUri,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        authUserId,
        accountId,
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        region,
        apiBaseUri,
      },
    });

  await inngest.send([
    {
      name: 'docusign/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'docusign/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'docusign/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
