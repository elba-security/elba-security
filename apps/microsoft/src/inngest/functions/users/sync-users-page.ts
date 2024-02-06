import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import type { MicrosoftUser } from '@/connectors/users';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: MicrosoftUser): User => ({
  id: user.id,
  email: user.mail || undefined,
  displayName: user.displayName || user.userPrincipalName,
  additionalEmails: [],
});

/**
 * DISCLAIMER:
 * This function, `syncUsersPage`, is provided as an illustrative example and is not a working implementation.
 * It is intended to demonstrate a conceptual approach for syncing users in a SaaS integration context.
 * Developers should note that each SaaS integration may require a unique implementation, tailored to its specific requirements and API interactions.
 * This example should not be used as-is in production environments and should not be taken for granted as a one-size-fits-all solution.
 * It's essential to adapt and modify this logic to fit the specific needs and constraints of the SaaS platform you are integrating with.
 */
export const syncUsersPage = inngest.createFunction(
  {
    id: 'microsoft/sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'microsoft/users.sync_page.triggered' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, tenantId, skipToken, region } = event.data;

    const [organisation] = await db
      .select({ token: Organisation.token })
      .from(Organisation)
      .where(and(eq(Organisation.id, organisationId), eq(Organisation.tenantId, tenantId)));

    if (!organisation) {
      throw new NonRetriableError(
        `Could not retrieve organisation with id=${organisationId}, tenantId=${tenantId} and region=${region}`
      );
    }

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const nextSkipToken = await step.run('paginate', async () => {
      const result = await getUsers({
        token: await decrypt(organisation.token),
        tenantId,
        skipToken,
      });

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieve users contains invalid data', {
          organisationId,
          tenantId,
          invalidUsers: result.invalidUsers,
        });
      }

      await elba.users.update({
        users: result.validUsers.map(formatElbaUser),
      });

      return result.nextSkipToken;
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-users-page', {
        name: 'microsoft/users.sync_page.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
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
