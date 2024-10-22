import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/hubspot/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type HubspotUser } from '@/connectors/hubspot/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: HubspotUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser =
  ({ domain, portalId, authUserId }: { domain: string; portalId: number; authUserId: string }) =>
  (user: HubspotUser): User => ({
    id: user.id,
    displayName: formatElbaUserDisplayName(user),
    email: user.email,
    role: user.superAdmin ? 'admin' : 'user',
    additionalEmails: [],
    isSuspendable: !user.superAdmin && user.id !== authUserId,
    url: `https://${domain}/settings/${portalId}/users/user/${user.id}`,
  });

export const syncUsers = inngest.createFunction(
  {
    id: 'hubspot-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'hubspot/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'hubspot/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'hubspot/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken, page });

      const users = result.validUsers.map(formatElbaUser(organisation));

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
        name: 'hubspot/users.sync.requested',
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
