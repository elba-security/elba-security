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
import { type JumpcloudUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';

const formatElbaUserDisplayName = (user: JumpcloudUser) => {
  if (user.firstname && user.lastname) {
    return `${user.firstname} ${user.lastname}`;
  }
  return user.username || user.email;
};

const formatElbaUserAuthMethod = (user: JumpcloudUser) => {
  if (user.enableMultiFactor) {
    return 'mfa';
  }
  if (user.mfaEnrollment && user.mfaEnrollment.overallStatus !== 'NOT_ENROLLED') {
    return 'mfa';
  }
  return 'password';
};

const formatElbaUser = (user: JumpcloudUser, role: 'admin' | 'member'): User => ({
  id: user._id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: user.alternateEmail ? [user.alternateEmail] : [],
  role,
  authMethod: formatElbaUserAuthMethod(user),
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
  { event: 'jumpcloud/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page, role } = event.data;

    const [organisation] = await db
      .select({
        apiKey: Organisation.apiKey,
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

    const apiKey = await decrypt(organisation.apiKey);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey,
        after: page,
        role,
      });

      const users = result.validUsers
        .filter(({ suspended }) => !suspended)
        .map((user) => formatElbaUser(user, role));

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
    if (nextPage || role === 'admin') {
      await step.sendEvent('synchronize-users', {
        name: 'jumpcloud/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage || null,
          role: nextPage ? role : 'member',
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
