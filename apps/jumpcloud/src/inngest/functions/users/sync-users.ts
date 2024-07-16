import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/jumpcloud/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type JumpcloudUser } from '@/connectors/jumpcloud/users';
import { createElbaClient } from '@/connectors/elba/client';
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

const formatElbaUserUrl = (user: JumpcloudUser, role: 'admin' | 'member') => {
  return role === 'admin'
    ? `https://console.jumpcloud.com/#/settings/administrators/details/${user._id}`
    : `https://console.jumpcloud.com/#/users/${user._id}/details`;
};

const formatElbaUser = (user: JumpcloudUser, role: 'admin' | 'member'): User => ({
  id: user._id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: user.alternateEmail ? [user.alternateEmail] : [],
  role,
  authMethod: formatElbaUserAuthMethod(user),
  url: formatElbaUserUrl(user, role),
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'jumpcloud-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'jumpcloud/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'jumpcloud/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'jumpcloud/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page, role } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const decryptedApiKey = await decrypt(organisation.apiKey);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey: decryptedApiKey,
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

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage || role === 'admin') {
      await step.sendEvent('synchronize-users', {
        name: 'jumpcloud/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage || 0,
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
