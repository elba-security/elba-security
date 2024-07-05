import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/zendesk/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type ZendeskUser } from '@/connectors/zendesk/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  user,
  subDomain,
  ownerId,
}: {
  user: ZendeskUser;
  subDomain: string;
  ownerId: string;
}): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  role: user.role,
  additionalEmails: [],
  isSuspendable: String(user.id) !== ownerId,
  url: `${subDomain}/admin/people/team/members`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'zendesk-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'zendesk/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'zendesk/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'zendesk/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        region: organisationsTable.region,
        subDomain: organisationsTable.subDomain,
        ownerId: organisationsTable.ownerId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);
    const subDomain = organisation.subDomain;
    const ownerId = organisation.ownerId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken: token, page, subDomain });

      const users = result.validUsers
        .filter(({ active, suspended }) => active && !suspended)
        .map((user) => formatElbaUser({ user, subDomain, ownerId }));

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
        name: 'zendesk/users.sync.requested',
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
