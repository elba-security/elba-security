import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/sendgrid/users';
import { inngest } from '@/inngest/client';
import { type SendgridUser } from '@/connectors/sendgrid/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

const formatElbaUser = (user: SendgridUser): User => ({
  id: user.username,
  displayName: user.username,
  email: user.email,
  role: user.user_type, // 'owner' | 'admin' |'teammate'
  additionalEmails: [],
  isSuspendable: user.user_type !== 'owner',
  url: 'https://app.sendgrid.com/settings/teammates',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'sendgrid-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.SENDGRID_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sendgrid/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'sendgrid/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sendgrid/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');

      const result = await getUsers({
        apiKey: credentials.apiKey,
        offset: page,
      });

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

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'sendgrid/users.sync.requested',
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
