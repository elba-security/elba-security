import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/sentry/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type SentryUser } from '@/connectors/sentry/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({organizationSlug, user}:{ organizationSlug: string, user:SentryUser}): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: user.role,
  authMethod: user.user?.has2fa ? 'mfa' : 'password',
  additionalEmails: [],
  isSuspendable: user.role !== 'owner',
  url: `https://${organizationSlug}.sentry.io/settings/members/`
});

export const syncUsers = inngest.createFunction(
  {
    id: 'sentry-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'sentry/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sentry/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sentry/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        organizationSlug: organisationsTable.organizationSlug,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);

    const organizationSlug = organisation.organizationSlug; 
    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        accessToken: token,
        cursor: page,
        organizationSlug,
      });

      const users = result.validUsers
        .filter((user) => !user.pending && user.user?.isActive)
        .map((user) => formatElbaUser({ organizationSlug, user }));

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
      await step.sendEvent('synchronize-users', {
        name: 'sentry/users.sync.requested',
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
