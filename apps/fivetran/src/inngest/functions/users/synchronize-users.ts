import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type FivetranUser } from '@/connectors/users';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: FivetranUser) => {
  if (user.given_name && user.family_name) {
    return `${user.given_name} ${user.family_name}`;
  }
  return user.email;
};

const formatElbaUser = (user: FivetranUser): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.role === 'Account Administrator' ? 'admin' : 'member',
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'fivetran-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'fivetran/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
        apiSecret: Organisation.apiSecret,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey: organisation.apiKey,
        apiSecret: organisation.apiSecret,
        afterToken: page,
      });

      const users = result.validUsers.filter(({ active }) => active).map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }
      await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'fivetran/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
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
