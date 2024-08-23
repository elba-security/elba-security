import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type BitbucketUser, getUsers } from '@/connectors/bitbucket/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: BitbucketUser): User => ({
  id: user.user.uuid,
  displayName: user.user.display_name,
  additionalEmails: [],
  url: `https://bitbucket.org/${user.workspace.slug}/workspace/settings/user-directory`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'bitbucket-sync-users',
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
        event: 'bitbucket/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'bitbucket/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'bitbucket/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);
    const workspaceId = organisation.workspaceId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken,
        workspaceId,
        page,
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

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'bitbucket/users.sync.requested',
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
