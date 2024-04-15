import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type DbtlabsUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: DbtlabsUser): User => ({
  id: user.id.toString(),
  displayName: `${user.fullname}`,
  email: user.email,
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
  { event: 'dbtlabs/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        serviceToken: Organisation.serviceToken,
        accountId: Organisation.accountId,
        accessUrl: Organisation.accessUrl,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { accountId, accessUrl, region } = organisation;

    const elba = getElbaClient({ organisationId, region });
    const serviceToken = await decrypt(organisation.serviceToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        serviceToken,
        accountId,
        accessUrl,
        afterToken: page,
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
        name: 'dbtlabs/users.sync.requested',
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
