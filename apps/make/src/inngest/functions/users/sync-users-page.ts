/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { type MakeUser, getUsers } from '@/connectors/make/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '../../../common/crypto';

const formatElbaUser = (user: MakeUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: 'member',
  authMethod: 'password',
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'make-sync-users-page',
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
        event: 'make/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'make/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'make/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, page, sourceOrganizationId } = event.data

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.token,
          region: Organisation.region,
          zoneDomain: Organisation.zoneDomain,
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
      const result = await getUsers(token, sourceOrganizationId, page, organisation.zoneDomain);
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
        name: 'make/users.sync.requested',
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
    await step.sendEvent('make/users.sync.completed', {
      name: 'make/users.sync.completed',
      data: {
        organisationId,
        sourceOrganizationId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
