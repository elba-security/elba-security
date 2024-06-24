import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/salesforce/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type SalesforceUser } from '@/connectors/salesforce/users';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUserEmail = (user: SalesforceUser): string | undefined => {
  const emailSchema = z.string().email();
  if (user.Email && emailSchema.safeParse(user.Email).success) {
    return user.Email;
  }
};
const formatElbaUser = (user: SalesforceUser): User => ({
  id: user.Id,
  displayName: user.Name,
  email: formatElbaUserEmail(user),
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'salesforce-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SALESFORCE_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'salesforce/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'salesforce/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesforce/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        region: organisationsTable.region,
        instanceUrl: organisationsTable.instanceUrl,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);
    const instanceUrl = organisation.instanceUrl;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken: token, instanceUrl, offset: page });

      const users = result.validUsers.filter(({ IsActive }) => IsActive).map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) await elba.users.update({ users });

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'salesforce/users.sync.requested',
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
