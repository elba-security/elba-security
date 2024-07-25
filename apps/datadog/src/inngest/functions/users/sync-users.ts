import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { type DatadogUser, getUsers } from '@/connectors/datadog/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserAuthMethod = (user: DatadogUser) => {
  if (user.attributes.mfa_enabled) {
    return 'mfa';
  }
  return 'password';
};
const formatElbaUserDisplayName = (user: DatadogUser) => {
  if (user.attributes.name === '') {
    return user.attributes.email;
  }
  return user.attributes.name;
};
const formatElbaUser = (user: DatadogUser): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.attributes.email,
  authMethod: formatElbaUserAuthMethod(user),
  additionalEmails: [],
  isSuspendable: true,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'datadog-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'datadog/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'datadog/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'datadog/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        appKey: organisationsTable.appKey,
        sourceRegion: organisationsTable.sourceRegion,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({
      organisationId,
      region: organisation.region,
    });

    const decryptedToken = await decrypt(organisation.apiKey);
    const appKey = organisation.appKey;
    const sourceRegion = organisation.sourceRegion;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey: decryptedToken,
        appKey,
        sourceRegion,
        page,
      });

      const users = result.validUsers
        .filter(({ attributes }) => attributes.status === 'Active')
        .map(formatElbaUser);

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
        name: 'datadog/users.sync.requested',
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
