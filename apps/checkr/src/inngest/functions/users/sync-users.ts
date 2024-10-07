import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/checkr/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type CheckrUser } from '@/connectors/checkr/users';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

enum RolePriority {
  Admin = 1,
  RestrictedAdmin = 2,
  Adjudicator = 3,
  Billing = 4,
  Requester = 5,
  LimitedUser = 6,
}

const formatElbaUserRole = (user: CheckrUser) => {
  // Handle case where there are no roles or roles[0] is undefined
  if (user.roles.length === 0 || !user.roles[0]?.name) {
    return undefined;
  }

  let highestRole = user.roles[0]?.name;

  // Function to convert snake_case to PascalCase
  const toPascalCase = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  };

  for (let i = 1; i < user.roles.length; i++) {
    const currentRole = user.roles[i]?.name;

    // Skip if currentRole or highestRole is undefined
    if (!currentRole || !highestRole) continue;

    // Convert role names to PascalCase before comparing
    const formattedCurrentRole = toPascalCase(currentRole);
    const formattedHighestRole = toPascalCase(highestRole);

    // Compare based on RolePriority and reassign highestRole if necessary
    if (
      RolePriority[formattedCurrentRole as keyof typeof RolePriority] <
      RolePriority[formattedHighestRole as keyof typeof RolePriority]
    ) {
      highestRole = currentRole; // Store the original name, not the PascalCase one
    }
  }

  return highestRole;
};

const formatElbaUser = ({ user }: { user: CheckrUser }): User => ({
  id: user.id,
  displayName: user.full_name,
  email: user.email,
  additionalEmails: [],
  role: formatElbaUserRole(user),
  url: `https://dashboard.checkrhq-staging.net/account/user/${user.id}`, // Do we need to change the url in production?
});

export const syncUsers = inngest.createFunction(
  {
    id: 'checkr-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'checkr/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'checkr/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'checkr/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

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

    const { region } = organisation;

    const elba = createElbaClient({ organisationId, region });
    const apiKey = await decrypt(organisation.apiKey);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey,
        page,
      });

      const users = result.validUsers.map((user) => formatElbaUser({ user }));

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
        name: 'checkr/users.sync.requested',
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
