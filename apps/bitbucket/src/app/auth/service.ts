import { addSeconds, subMinutes } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getWorkspace } from '@/connectors/bitbucket/workspace';
import { getAccessToken } from '@/connectors/bitbucket/auth';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  accessCode: string;
};

export const setupOrganisation = async ({
  organisationId,
  accessCode,
  region,
}: SetupOrganisationParams) => {
  // Exchange the authorization code for an access token
  const { refreshToken, accessToken, expiresIn } = await getAccessToken(accessCode);
  const { uuid: workspaceId } = await getWorkspace(accessToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, accessToken, refreshToken, workspaceId })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken,
        refreshToken,
        workspaceId,
      },
    });

  await inngest.send([
    {
      name: 'bitbucket/bitbucket.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'bitbucket/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        nextUrl: null,
      },
    },
    {
      name: 'bitbucket/token.refresh.requested',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: subMinutes(addSeconds(new Date(), expiresIn), 5).getTime(),
    },
  ]);
};
