import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getCredentials } from '@elba-security/nango';
import { getUsers } from '@/connectors/docusign/users';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { type DocusignUser } from '@/connectors/docusign/users';
import { organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getRequestInfo } from '@/connectors/docusign/request-info';

const formatElbaUserDisplayName = (user: DocusignUser) => {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  return user.email;
};

const formatElbaUser = ({
  user,
  isSuspendable,
}: {
  user: DocusignUser;
  isSuspendable: boolean;
}): User => ({
  id: user.userId,
  displayName: formatElbaUserDisplayName(user),
  role: user.permissionProfileName,
  email: user.email,
  additionalEmails: [],
  isSuspendable,
  url: `https://apps.docusign.com/admin/edit-user/${user.userId}`, // Development base url:  https://apps-d.docusign.com
});

export const syncUsers = inngest.createFunction(
  {
    id: 'docusign-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'docusign/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'docusign/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'docusign/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        // connectionId: organisationsTable.connectionId,
        region: organisationsTable.region,
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

    const { credentials } = await getCredentials(organisationId);

    if (!credentials) {
      throw new NonRetriableError(`Could not retrieve credentials`);
    }

    const { ownerId, baseUri, accountId } = await getRequestInfo(
      credentials.access_token,
      env.DOCUSIGN_ROOT_URL
    );

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken: credentials.access_token,
        accountId,
        apiBaseUri: baseUri,
        page,
      });

      const users = result.validUsers.map((user) => {
        return formatElbaUser({ user, isSuspendable: user.userId !== ownerId });
      });

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
        name: 'docusign/users.sync.requested',
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
