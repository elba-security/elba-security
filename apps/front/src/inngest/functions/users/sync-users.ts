import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango/api';
import { type FrontUser } from '@/connectors/front/users';
import { getUsers } from '@/connectors/front/users';

const formatElbaUserDisplayName = (user: FrontUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = (user: FrontUser): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.is_admin ? 'admin' : 'member', //  it is not a good choice to define roles based on the is_admin field, however since  there are only two roles in the system, we can use this field to determine the role of the user
  additionalEmails: [],
  url: `https://app.frontapp.com/settings/global/teammates/edit/${user.username}/overview`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'front-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'front/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'front/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'front/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });

    await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id=${organisationId}`
        );
      }

      // Teammates API doesn't support pagination (it is verified with support team)
      // https://dev.frontapp.com/reference/list-teammates
      const result = await getUsers(credentials.access_token);

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
