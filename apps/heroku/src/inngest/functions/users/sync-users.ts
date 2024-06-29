import { Elba } from '@elba-security/sdk';
import { and, eq, lt } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable, teamUsersTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { getTeams } from '@/connectors/teams';
import { syncTeamUsers } from './sync-team-users';

// TODO: test me
export const syncUsers = inngest.createFunction(
  {
    id: 'heroku-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'heroku/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'heroku/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, cursor, isFirstSync } = event.data;

    // retrieve the Heroku API Access Token and team Id
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select()
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const result = await step.run('list-teams', () => getTeams(organisation.accessToken, cursor));

    await Promise.all(
      result.teams.map(({ id }) =>
        step.invoke(`sync-team-users-${id}`, {
          function: syncTeamUsers,
          data: {
            organisationId,
            syncStartedAt,
            teamId: id,
            isFirstSync,
            cursor: null,
          },
        })
      )
    );

    // if there is a next range enqueue a new sync user event
    if (result.nextCursor) {
      await step.sendEvent('sync-next-teams-page', {
        name: 'heroku/users.sync.requested',
        data: {
          ...event.data,
          nextCursor: result.nextCursor,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', async () => {
      await db
        .delete(teamUsersTable)
        .where(
          and(
            eq(teamUsersTable.organisationId, organisationId),
            lt(teamUsersTable.lastSyncAt, new Date(syncStartedAt))
          )
        );
      const elba = new Elba({
        organisationId,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
        region: organisation.region,
      });
      await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
    });

    return {
      status: 'completed',
    };
  }
);
