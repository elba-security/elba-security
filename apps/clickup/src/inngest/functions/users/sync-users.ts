import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { type ClickUpUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { getElbaClient } from '@/connectors/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: ClickUpUser): User => ({
  id: user.id,
  displayName: user.username,
  email: user.email,
  role: user.role,
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'clickup-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'clickup/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'clickup/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region } = event.data;

    const elba = getElbaClient({organisationId, region})

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          teamId: Organisation.teamId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    await step.run('list-users', async () => {
      const decryptedToken = await decrypt(organisation.accessToken);
      const result = await getUsers(decryptedToken, organisation.teamId);
      const users = result.users.map(formatElbaUser);
      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      await elba.users.update({ users });
    });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
