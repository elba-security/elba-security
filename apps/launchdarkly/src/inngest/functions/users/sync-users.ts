import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/launchdarkly/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type LaunchdarklyUser } from '@/connectors/launchdarkly/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUserDisplayName = (user: LaunchdarklyUser) => {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  return user.email;
};

const formatElbaUser = (user: LaunchdarklyUser): User => ({
  id: user._id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.role || undefined,
  additionalEmails: [],
  isSuspendable: user.role !== 'owner',
  url: `https://app.launchdarkly.com/settings/members/${user._id}/permissions`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'launchdarkly-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.LAUNCHDARKLY_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'launchdarkly/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'launchdarkly/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'launchdarkly/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

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

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const apiKey = await decrypt(organisation.apiKey);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey,
        nextLink: page,
      });

      const users = result.validUsers
        .filter(({ _pendingInvite }) => !_pendingInvite)
        .map(formatElbaUser);

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

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'launchdarkly/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
