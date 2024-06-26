import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { ClickupUserSchema, getUsers } from '@/connectors/clickup/users';
import { db } from '@/database/client';
import {z} from 'zod'
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: z.infer<typeof ClickupUserSchema>): User => ({
  id: user.id,
  displayName: user.username,
  email: user.email,
  role: user.role,
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
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
    const { organisationId, teamId } = event.data

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
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

    await step.run('list-users', async () => {
      const result = await getUsers(token, teamId);
      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      if(users.length > 0) {
        await elba.users.update({ users });
       }
    });

    // Signal the completion of user sync for this team
    await step.sendEvent('clickup/users.sync.completed', {
      name: 'clickup/users.sync.completed',
      data: {
        organisationId,
        teamId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
