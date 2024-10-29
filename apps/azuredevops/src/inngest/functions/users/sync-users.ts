import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type AzuredevopsUser, getUsers } from '@/connectors/azuredevops/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  user,
  workspaceId,
  authUserEmail,
}: {
  user: AzuredevopsUser;
  workspaceId: string;
  authUserEmail: string;
}): User => ({
  id: user.descriptor,
  email: user.mailAddress,
  displayName: user.displayName,
  additionalEmails: [],
  isSuspendable: user.mailAddress !== authUserEmail,
  url: `https://dev.azure.com/${workspaceId}/_settings/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'azuredevops-sync-users',
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
        event: 'azuredevops/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'azuredevops/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'azuredevops/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
        authUserEmail: organisationsTable.authUserEmail,
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
    const authUserEmail = organisation.authUserEmail;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken,
        workspaceId,
        page,
      });

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, workspaceId, authUserEmail })
      );

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
        name: 'azuredevops/users.sync.requested',
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
