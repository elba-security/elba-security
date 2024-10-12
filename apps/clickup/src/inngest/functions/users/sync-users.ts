import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type ClickUpUser, getUsers } from '@/connectors/clickup/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({ teamId, user }: { teamId: string; user: ClickUpUser }): User => ({
  id: String(user.id),
  displayName: user.username || user.email,
  email: user.email,
  role: user.role,
  authMethod: undefined,
  additionalEmails: [],
  isSuspendable: user.role !== 'owner',
  url: `https://app.clickup.com/${teamId}/settings/team/${teamId}/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'clickup-sync-users',
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
        event: 'clickup/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'clickup/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'clickup/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        teamId: organisationsTable.teamId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);

    await step.run('list-users', async () => {
      const result = await getUsers({
        token,
        teamId: organisation.teamId,
      });
      const users = result.validUsers.map((user) =>
        formatElbaUser({
          teamId: organisation.teamId,
          user,
        })
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
    });

    return {
      status: 'completed',
    };
  }
);
