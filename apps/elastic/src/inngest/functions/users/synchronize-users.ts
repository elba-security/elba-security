import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type ElasticUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: ElasticUser): User => ({
  id: user.user_id,
  displayName: user.name ? `${user.name}` : `${user.email}`,
  email: user.email,
  role:
    user.role_assignments.organization && user.role_assignments.organization.length > 0
      ? 'organization-admin'
      : 'deployment-admin',
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

    const apiKey = await decrypt(organisation.apiKey);
    const accountId = organisation.accountId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey,
        accountId,
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
