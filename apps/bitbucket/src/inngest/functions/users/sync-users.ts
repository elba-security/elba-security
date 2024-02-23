import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { BitbucketUser } from '@/connectors/bitbucket/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/bitbucket/users';

const formatElbaUser = (user: BitbucketUser): User => ({
  id: user.accountId,
  displayName: user.displayName,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'bitbucket-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'bitbucket/bitbucket.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'bitbucket/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, nextUrl } = event.data;

    const [organisation] = await db
      .select({
        region: organisationsTable.region,
        accessToken: organisationsTable.accessToken,
        workspaceId: organisationsTable.workspaceId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    const nextPageUrl = await step.run('paginate', async () => {
      const result = await getUsers({
        accessToken: organisation.accessToken,
        workspaceId: organisation.workspaceId,
        nextUrl,
      });

      await elba.users.update({
        users: result.users.map(formatElbaUser),
      });

      return result.nextUrl;
    });

    if (nextUrl) {
      await step.sendEvent('sync-next-users-page', {
        name: 'bitbucket/users.sync.requested',
        data: {
          ...event.data,
          nextUrl: nextPageUrl,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });

    return {
      status: 'completed',
    };
  }
);
