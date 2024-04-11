import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { type HerokuUser } from '@/connectors/users';
import { db } from '@/database/client';
import { organisationsTable, teamUsersTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: HerokuUser): User => ({
  id: user.user.id,
  displayName: user.user.email,
  email: user.user.email,
  role: user.role,
  authMethod: user.two_factor_authentication ? 'mfa' : 'password',
  additionalEmails: [],
});

// TODO: test me
export const syncTeamUsers = inngest.createFunction(
  {
    id: 'heroku-sync-team-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 10,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'heroku/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'heroku/users.team-users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, teamId, cursor, syncStartedAt } = event.data;

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

    const nextCursor = await step.run('list-team-users', async () => {
      const result = await getUsers(organisation.accessToken, teamId, cursor);

      const elba = new Elba({
        organisationId,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
        region: organisation.region,
      });

      await db
        .insert(teamUsersTable)
        .values(
          result.users.map(({ user }) => ({
            userId: user.id,
            teamId,
            organisationId,
            lastSyncAt: new Date(syncStartedAt),
          }))
        )
        .onConflictDoNothing();

      await elba.users.update({ users: result.users.map(formatElbaUser) });

      return result.nextCursor;
    });

    if (nextCursor) {
      await step.invoke('sync-next-team-user-page', {
        function: syncTeamUsers,
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
    }
  }
);
