import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import type { MicrosoftUser } from '@/connectors/microsoft/users';
import { getUsers } from '@/connectors/microsoft/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: MicrosoftUser): User => ({
  id: user.id,
  email: user.mail || undefined,
  displayName: user.displayName || user.userPrincipalName,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'microsoft-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'microsoft/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, cursor } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        tenantId: organisationsTable.tenantId,
        region: organisationsTable.region,
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

    const nextCursor = await step.run('paginate', async () => {
      const result = await getUsers({
        token: await decrypt(organisation.token),
        tenantId: organisation.tenantId,
        skipToken: cursor,
      });

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          tenantId: organisation.tenantId,
          invalidUsers: result.invalidUsers,
        });
      }

      await elba.users.update({
        users: result.validUsers.map(formatElbaUser),
      });

      return result.nextSkipToken;
    });

    if (nextCursor) {
      await step.sendEvent('sync-next-users-page', {
        name: 'microsoft/users.sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
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
