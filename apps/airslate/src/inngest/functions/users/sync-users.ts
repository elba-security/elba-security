import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/airslate/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type AirslateUser } from '@/connectors/airslate/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  user,
  workspaceSubdomain,
}: {
  user: AirslateUser;
  workspaceSubdomain: string;
}): User => ({
  id: user.id,
  displayName: user.username,
  email: user.email,
  role: user.role.code,
  additionalEmails: [],
  isSuspendable: user.role.code !== 'WORKSPACE_OWNER',
  url: `https://${workspaceSubdomain}.airslate.com/management`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'airslate-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'airslate/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'airslate/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'airslate/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
        workspaceSubdomain: organisationsTable.workspaceSubdomain,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);
    const workspaceId = organisation.workspaceId;
    const workspaceSubdomain = organisation.workspaceSubdomain;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken: token,
        page,
        workspaceId,
      });

      const users = result.validUsers
        .filter((user) => user.org_data.status === 'ACTIVE')
        .map((user) => formatElbaUser({ user, workspaceSubdomain }));

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
        name: 'airslate/users.sync.requested',
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
