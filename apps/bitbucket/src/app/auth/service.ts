import { addSeconds } from 'date-fns/addSeconds';
import { getAccessToken } from '@/connectors/bitbucket/auth';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { getWorkspaces } from '@/connectors/bitbucket/workspaces';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
  workspaceId?: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
  workspaceId,
}: SetupOrganisationParams) => {
  const { accessToken, refreshToken, expiresIn } = await getAccessToken(code);
  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  // Fetch workspace IDs if workspaceId is not provided
  let selectedWorkspaceId = workspaceId;
  if (!selectedWorkspaceId) {
    const workspaces = await getWorkspaces(accessToken);

    if (workspaces.length > 1) {
      return {
        hasMultipleWorkspaces: true,
        workspaces,
      };
    }

    selectedWorkspaceId = workspaces[0].uuid;
  }
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      workspaceId: selectedWorkspaceId,
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        workspaceId: selectedWorkspaceId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'bitbucket/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'bitbucket/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'bitbucket/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
