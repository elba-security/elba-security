import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type OpenAiUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: OpenAiUser): User => ({
  id: user.user.id,
  displayName: user.user.name,
  email: user.user.email,
  role: user.role,
  authMethod: 'password',
  additionalEmails: [],
});

export type SyncUsersEventType = {
  organisationId: string;
  syncStartedAt: string;
  region: string;
};

export const syncUsersPage = inngest.createFunction(
  {
    id: 'open-ai-sync-users-page',
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
        event: 'open-ai/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'open-ai/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the OpenAI organisation token
    const [token, sourceOrganizationId] = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({
          token: Organisation.token,
          sourceOrganizationId: Organisation.sourceOrganizationId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      const organisationToken = organisation.token;
      const userOrganizationId = organisation.sourceOrganizationId;
      return [organisationToken, userOrganizationId];
    });

    if (token && sourceOrganizationId) {
      await step.run('list-users', async () => {
        // retrieve this users page
        const result = await getUsers(token, sourceOrganizationId);
        // format each OpenAI Users to elba users
        const users = result.users.map(formatElbaUser);
        // send the batch of users to elba
        logger.debug('Sending batch of users to elba: ', { organisationId, users });
        await elba.users.update({ users });
      });
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
