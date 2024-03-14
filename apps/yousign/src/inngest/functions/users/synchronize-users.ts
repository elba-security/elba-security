import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { type YousignUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: YousignUser): User => ({
  id: user.id,
  displayName: `${user.first_name} ${user.last_name}`,
  email: user.email,
  role: user.role === 'owner' ? 'admin' : 'user',
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'yousign/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: Organisation.token,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    const token = await decrypt(organisation.token);
    console.log('token:::', token);
    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        token,
        after: page,
      });

      const users = result.validUsers.filter(({ is_active: active }) => active).map(formatElbaUser);

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
        name: 'yousign/users.sync.requested',
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
