import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/elastic/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type ElasticUser } from '@/connectors/elastic/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUserRole = (role: ElasticUser['role_assignments']): string => {
  // Even if the role properties are arrays, only one role is assigned to each user.
  const organisationRole = role?.organization?.at(0);
  if (organisationRole) {
    return organisationRole.role_id.replaceAll('-', ' ');
  }
  const deploymentRole = role?.deployment?.at(0);
  if (deploymentRole) {
    return deploymentRole.role_id.replaceAll('-', ' ');
  }
  return 'member';
};

const formatElbaUser = (user: ElasticUser): User => ({
  id: user.user_id,
  displayName: user.name || user.email,
  email: user.email,
  role: formatElbaUserRole(user.role_assignments),
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'elastic-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'elastic/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'elastic/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'elastic/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        accountId: organisationsTable.accountId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const apiKey = await decrypt(organisation.apiKey);
      const result = await getUsers({
        apiKey,
        accountId: organisation.accountId,
        afterToken: page,
      });

      const users = result.validUsers.map(formatElbaUser);

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
        name: 'elastic/users.sync.requested',
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
