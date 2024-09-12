import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/frontapp/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type FrontappUser } from '@/connectors/frontapp/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: FrontappUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = (user: FrontappUser): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.is_admin ? 'admin' : 'member', //  it is not a good choice to define roles based on the is_admin field, however since  there are only two roles in the system, we can use this field to determine the role of the user
  additionalEmails: [],
  url: `https://app.frontapp.com/settings/global/teammates/edit/${user.username}/overview`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'frontapp-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'frontapp/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'frontapp/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'frontapp/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);

    await step.run('list-users', async () => {
      // Teammates API doesn't support pagination (it is verified with support team)
      // https://dev.frontapp.com/reference/list-teammates
      const result = await getUsers(token);

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }
    });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
