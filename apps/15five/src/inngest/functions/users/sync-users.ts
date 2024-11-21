import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/fifteenfive/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type FifteenFiveUser } from '@/connectors/fifteenfive/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: FifteenFiveUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = ({
  user,
  authUserEmail,
}: {
  user: FifteenFiveUser;
  authUserEmail: string;
}): User => ({
  id: String(user.id),
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: [],
  isSuspendable: user.email !== authUserEmail,
  url: `https://my.15five.com/account/settings/${user.id}/`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'fifteenfive-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'fifteenfive/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'fifteenfive/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'fifteenfive/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        authUserEmail: organisationsTable.authUserEmail,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const apiKey = await decrypt(organisation.apiKey);
    const authUserEmail = organisation.authUserEmail;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ apiKey, nextPageUrl: page });

      const users = result.validUsers.map((user) => formatElbaUser({ user, authUserEmail }));

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
      await step.sendEvent('synchronize-users', {
        name: 'fifteenfive/users.sync.requested',
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
