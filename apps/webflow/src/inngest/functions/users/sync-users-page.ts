/* eslint-disable no-return-await */
/* eslint-disable no-await-in-loop */
import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/webflow/users';
import { type WebflowUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: WebflowUser): User => ({
  id: user.id,
  displayName: user.data.name,
  email: user.data.email,
  role: 'member',
  authMethod: undefined,
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
        event: 'webflow/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'webflow/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, page, siteId } = event.data;

    // retrieve the Webflow Organisation
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          region: Organisation.region,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers(token, siteId, page);
      const users = result.users.map(formatElbaUser);
      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      await elba.users.update({ users });

      if (result.pagination.next) {
        return result.pagination.next;
      }
      return null;
    });

    if (nextPage) {
      await step.sendEvent('sync-users-page', {
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
    await step.sendEvent('webflow/users.sync.completed', {
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



