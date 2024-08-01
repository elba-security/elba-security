import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { type ElasticUser, getAllUsers } from '@/connectors/elastic/users';
import { getOrganizationId } from '@/connectors/elastic/organization';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserRole = (role: ElasticUser['role_assignments']): string => {
  // Even if the role properties are arrays, only one role is assigned to each user.
  const organisationRole = role?.organization?.at(0);
  if (organisationRole) {
    return organisationRole.role_id.replace(/-/g, ' ');
  }
  const deploymentRole = role?.deployment?.at(0);
  if (deploymentRole) {
    return deploymentRole.role_id.replace(/-/g, ' ');
  }
  return 'member';
};

const formatElbaUser = (user: ElasticUser): User => ({
  id: user.user_id,
  displayName: user.name || user.email,
  email: user.email,
  role: formatElbaUserRole(user.role_assignments),
  additionalEmails: [],
  url: 'https://cloud.elastic.co/account/members',
  isSuspendable: true,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'elastic-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'elastic/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'elastic/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'elastic/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
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

    const decryptedApiKey = await decrypt(organisation.apiKey);

    const { organizationId } = await step.run('get-organization-id', async () => {
      return getOrganizationId({ apiKey: decryptedApiKey });
    });

    await step.run('list-all-users', async () => {
      const result = await getAllUsers({ apiKey: decryptedApiKey, organizationId });

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }
    });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
