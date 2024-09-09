import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/pipedrive/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type PipedriveUser } from '@/connectors/pipedrive/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({ user, apiDomain }: { user: PipedriveUser; apiDomain: string }): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  role: user.is_admin === 1 ? 'admin' : 'user',
  url: `${apiDomain}/users/details/${user.id}/updates`,
  isSuspendable: !user.is_you,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'pipedrive-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'pipedrive/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'pipedrive/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'pipedrive/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        apiDomain: organisationsTable.apiDomain,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);
    const apiDomain = organisation.apiDomain;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken, page, apiDomain });

      const users = result.validUsers
        .filter(({ active_flag: active }) => active)
        .map((user) => formatElbaUser({ user, apiDomain }));

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
        name: 'pipedrive/users.sync.requested',
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
