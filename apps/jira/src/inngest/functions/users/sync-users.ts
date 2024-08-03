import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { type JiraUser, getUsers } from '@/connectors/jira/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  user,
  domain,
  ownerId,
}: {
  user: JiraUser;
  domain: string;
  ownerId: string;
}): User => ({
  id: user.accountId,
  displayName: user.displayName,
  email: user.emailAddress,
  additionalEmails: [],
  isSuspendable: String(user.accountId) !== ownerId,
  url: `https://${domain}.atlassian.net/jira/people/${user.accountId}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'jira-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'jira/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'jira/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'jira/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiToken: organisationsTable.apiToken,
        domain: organisationsTable.domain,
        email: organisationsTable.email,
        region: organisationsTable.region,
        ownerId: organisationsTable.ownerId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({
      organisationId,
      region: organisation.region,
    });

    const decryptedToken = await decrypt(organisation.apiToken);
    const domain = organisation.domain;
    const email = organisation.email;
    const ownerId = organisation.ownerId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ apiToken: decryptedToken, domain, email, page });

      const users = result.validUsers.map((user) => formatElbaUser({ user, domain, ownerId }));

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
        name: 'jira/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
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
