import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { organisationsTable, teamUsersTable } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteHerokuUser = inngest.createFunction(
  {
    id: 'heroku-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'heroku/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Heroku organisation access token and team Id
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: organisationsTable.accessToken,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const teamUsers = await step.run('get-team-users', () =>
      db
        .select()
        .from(teamUsersTable)
        .where(
          and(eq(teamUsersTable.organisationId, organisationId), eq(teamUsersTable.userId, id))
        )
    );

    await step.run('delete-team-users', () =>
      Promise.all(
        teamUsers.map((teamUser) =>
          deleteUser(organisation.accessToken, teamUser.teamId, teamUser.userId)
        )
      )
    );
  }
);
