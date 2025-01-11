import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/make/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type MakeUser } from '@/connectors/make/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUser = ({
  user,
  selectedOrganizationId,
}: {
  user: MakeUser;
  selectedOrganizationId: string;
}): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  url: `https://eu2.make.com/${selectedOrganizationId}/team/users?offset=0&limit=50`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'make-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MAKE_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'make/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'make/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'make/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiToken: organisationsTable.apiToken,
        zoneDomain: organisationsTable.zoneDomain,
        selectedOrganizationId: organisationsTable.selectedOrganizationId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const apiToken = await decrypt(organisation.apiToken);
    const zoneDomain = organisation.zoneDomain;
    const selectedOrganizationId = organisation.selectedOrganizationId;
    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiToken,
        zoneDomain,
        selectedOrganizationId,
        page,
      });

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, selectedOrganizationId })
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

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'make/users.sync.requested',
        data: {
          ...event.data,
          page: String(nextPage),
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
