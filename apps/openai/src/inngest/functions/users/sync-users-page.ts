import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type OpenAiUser, getUsers } from '@/connectors/openai/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: OpenAiUser): User => ({
  id: user.user.id,
  displayName: user.user.name,
  email: user.user.email,
  role: user.role,
  additionalEmails: [],
});

export type SyncUsersEventType = {
  organisationId: string;
  syncStartedAt: string;
  region: string;
};

export const syncUsers = inngest.createFunction(
  {
    id: 'openai-sync-users',
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
        event: 'openai/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'openai/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient(organisationId, organisation.region);

    await step.run('list-users', async () => {
      const result = await getUsers({
        organizationId: organisation.organizationId,
        apiKey: organisation.apiKey,
      });
      const users = result.users.map(formatElbaUser);

      if (users.length > 0) {
        logger.debug('Sending batch of users to elba: ', { organisationId, users });
        await elba.users.update({ users });
      }
    });

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );
  }
);
