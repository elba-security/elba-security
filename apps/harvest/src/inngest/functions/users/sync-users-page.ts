import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { type HarvestUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: HarvestUser): User => ({
  id: String(user.id),
  displayName: user.first_name,
  email: user.email,
  role: user.access_roles.includes('administrator') ? 'administrator' : 'member',
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'harvest-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'harvest/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'harvest/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, page, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const organisation = await step.run('get-organisation', async () => {
      const [organisationRecord] = await db
        .select({
          accessToken: Organisation.accessToken,
          harvestId: Organisation.harvestId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisationRecord) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return organisationRecord;
    });

    const nextPage = await step.run('list-users', async () => {
      const decryptedToken = await decrypt(organisation.accessToken);

      const result = await getUsers(decryptedToken, organisation.harvestId, page);

      const users = result.users.map(formatElbaUser);

      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      await elba.users.update({ users });

      if (result.next_page) {
        return result.next_page;
      }
      return null;
    });

    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'harvest/users.page_sync.requested',
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
