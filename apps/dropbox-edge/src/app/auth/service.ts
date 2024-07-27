import { addSeconds } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/dropbox/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAuthenticatedAdmin, getCurrentUserAccount } from '@/connectors/dropbox/users';

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

  const { teamMemberId } = await getAuthenticatedAdmin(accessToken);
  const { rootNamespaceId } = await getCurrentUserAccount({ accessToken, teamMemberId });

  const encryptedAccessToken = await encrypt(accessToken);
  const encryptedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      rootNamespaceId,
      adminTeamMemberId: teamMemberId,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        rootNamespaceId,
        adminTeamMemberId: teamMemberId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'dropbox/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        cursor: null,
      },
    },
    {
      name: 'dropbox/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'dropbox/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
