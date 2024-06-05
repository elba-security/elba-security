import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import {
  deleteUsersFromTeam,
  deleteUsersFromWorkspace,
  getUsersTeams,
} from '@/connectors/monday/users';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getWorkspaceIds } from '@/connectors/monday/auth';

export const deleteUsers = inngest.createFunction(
  {
    id: 'monday-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MONDAY_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'monday/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'monday/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'monday/users.delete.requested' },
  async ({ event, step, logger }) => {
    const { userIds, organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve ${organisationId}`);
    }

    const accessToken = await decrypt(organisation.accessToken);

    const workspaceIds = await step.run('get-workspace-ids', async () => {
      return getWorkspaceIds(accessToken);
    });

    const teamsUsers = await step.run('get-users-teams', async () => {
      const { validUsers, invalidUsers } = await getUsersTeams({ userIds, accessToken });

      if (invalidUsers.length) {
        logger.error(`Got invalid users while deleting Monday users`, {
          organisationId,
          userIds,
          invalidUsers,
        });
      }

      const teamsUsersMap = new Map<string, string[]>();
      for (const user of validUsers) {
        for (const team of user.teams) {
          const teamUsers = teamsUsersMap.get(team.id);
          if (!teamUsers) {
            teamsUsersMap.set(team.id, [user.id]);
          } else {
            teamUsers.push(user.id);
          }
        }
      }
      return [...teamsUsersMap.entries()];
    });

    await Promise.all(
      teamsUsers.map(async ([teamId, teamUserIds]) => {
        await step.run(`delete-users-from-team-${teamId}`, async () => {
          return deleteUsersFromTeam({ userIds: teamUserIds, teamId, accessToken });
        });
      })
    );

    await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        await step.run(`delete-users-from-workspace-${workspaceId}`, async () => {
          return deleteUsersFromWorkspace({
            userIds,
            workspaceId,
            accessToken,
          });
        });
      })
    );
  }
);
