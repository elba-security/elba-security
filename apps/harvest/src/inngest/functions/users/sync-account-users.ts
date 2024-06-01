import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/harvest/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type HarvestUser } from '@/connectors/harvest/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: HarvestUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};
const formatElbaUser = (user: HarvestUser): User => ({
  id: String(user.id),
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.access_roles.includes('administrator') ? 'administrator' : 'member',
  additionalEmails: [],
});

export const syncAccountUsers = inngest.createFunction(
  {
    id: 'harvest-sync-account-users',
    retries: 5,
    cancelOn: [
      {
        event: 'harvest/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'harvest/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'harvest/users.account_users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, accountId, cursor } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    // Retrieve users for the specific account
    const nextCursor = await step.run('list-account-users', async () => {
      const elba = createElbaClient({ organisationId, region: organisation.region });
      const result = await getUsers({
        accessToken: await decrypt(organisation.accessToken),
        accountId,
        cursor,
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

    if (!nextCursor) {
      return;
    }

    await step.invoke('request-next-account-users-sync', {
      function: syncAccountUsers,
      data: {
        ...event.data,
        cursor: nextCursor,
      },
    });
  }
);
