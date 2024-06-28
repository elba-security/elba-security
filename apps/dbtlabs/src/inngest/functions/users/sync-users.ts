import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/dbtlabs/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type DbtlabsUser } from '@/connectors/dbtlabs/users';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  accessUrl,
  accountId,
  user,
}: {
  accessUrl: string;
  accountId: string;
  user: DbtlabsUser;
}): User => ({
  id: user.id.toString(),
  displayName: user.fullname,
  email: user.email,
  additionalEmails: [],
  url: `${accessUrl}/settings/accounts/${accountId}/pages/users`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'dbtlabs-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'dbtlabs/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'dbtlabs/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'dbtlabs/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        serviceToken: organisationsTable.serviceToken,
        accountId: organisationsTable.accountId,
        accessUrl: organisationsTable.accessUrl,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { accountId, accessUrl, region } = organisation;

    const elba = createElbaClient({ organisationId, region });
    const serviceToken = await decrypt(organisation.serviceToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        serviceToken,
        accountId,
        accessUrl,
        page,
      });

      const users = result.validUsers.map((user) => formatElbaUser({ accessUrl, accountId, user }));

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
        name: 'dbtlabs/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return { status: 'ongoing' };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return { status: 'completed' };
  }
);
