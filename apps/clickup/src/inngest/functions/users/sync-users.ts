/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/clickup/users';
import { type ClickUpUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

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
    retries: 5,
    cancelOn: [
      {
        event: 'clickup/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'clickup/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt } = event.data

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          teamIds: Organisation.teamIds,
          region: Organisation.region,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);

    let allUsers: User[] = [];

    for (const teamId of organisation.teamIds) {
      await step.run('list-users', async () => {
        const result = await getUsers(token, teamId);
        const users = result.users.map(formatElbaUser);
        allUsers = allUsers.concat(users);
        logger.debug('Sending batch of users to elba: ', {
          organisationId,
          users,
        });
        await elba.users.update({ users });
      });
    }

    await elba.users.update({ users: allUsers });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
