import { getAccessToken } from '@/connectors/clickup/auth';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { getTeamIds } from '@/connectors/clickup/teams';
import { encrypt } from '../../common/crypto';

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
  const accessToken = await getAccessToken(code);
  const teamIds = await getTeamIds(accessToken);

  if (teamIds.length > 1) {
    return {
      hasMultipleWorkspaces: true,
    };
  }

  const encodedToken = await encrypt(accessToken);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encodedToken,
      teamId: teamIds[0].id,
      region,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        id: organisationId,
        accessToken: encodedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'clickup/users.sync.requested',
      data: {
        organisationId,
        syncStartedAt: Date.now(),
        isFirstSync: true,
      },
    },
    {
      name: 'clickup/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
