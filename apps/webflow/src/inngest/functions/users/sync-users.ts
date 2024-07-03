import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { WebflowUser } from '@/connectors/webflow/users';
import { getUsers } from '@/connectors/webflow/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: WebflowUser): User => ({
  id: user.id,
  displayName: user.data.name,
  email: user.data.email,
  role: 'member',
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'webflow-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'webflow/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    onFailure: async ({ step, event }) => {
      await step.sendEvent('failed', {
        name: 'webflow/users.sync.completed',
        data: {
          siteId: event.data.event.data.siteId,
          organisationId: event.data.event.data.organisationId,
        },
      });
    },
  },
  { event: 'webflow/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, page, siteId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: organisationsTable.accessToken,
          region: organisationsTable.region,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      return result;
    });

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        siteId,
        token,
        page,
      });

      const users = result.validUsers.map(formatElbaUser);

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
      await step.sendEvent('sync-users', {
        name: 'webflow/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    // Signal the completion of user sync for this site
    await step.sendEvent('sync-users-completed', {
      name: 'webflow/users.sync.completed',
      data: {
        organisationId,
        siteId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
