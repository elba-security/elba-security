import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers, type AsanaUser } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: AsanaUser): User => ({
  id: user.gid,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'users/sync' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, offset } = event.data;

    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const accessToken = await step.run('get-access-token', async () => {
      const [organisation] = await db
        .select({ accessToken: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      
      return organisation.accessToken;
    });

    const nextOffset = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(
        accessToken,
        // TODO: retrieve this workspace id from somewhere
        '1205941523188542',
        offset
      );
      // format each SaaS users to elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      await elba.users.update({ users });

      return result.offset;
    });

    // if there is a next enqueue a new sync user event
    if (nextOffset) {
      await step.sendEvent('sync-users', {
        name: 'users/sync',
        data: {
          ...event.data,
          page: nextOffset,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
