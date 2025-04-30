import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { type OpenAiUser, getUsers } from '@/connectors/openai/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

// An organisation can have multiple owners, but only one can be the actual owner.
// Allowing to remove all owners of the organisation would be a security risk.
// therefore, if the admin wants to remove the owner, they can remove it from the OpenAi platform
const formatElbaUser = (user: OpenAiUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: user.role, // 'owner' | 'reader'
  additionalEmails: [],
  isSuspendable: user.role !== 'owner',
  url: 'https://platform.openai.com/settings/organization/members',
});

export type SyncUsersEventType = {
  organisationId: string;
  syncStartedAt: string;
  region: string;
};

export const syncUsers = inngest.createFunction(
  {
    id: 'openai-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'openai/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'openai/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'openai/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, nangoConnectionId, region, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');
      const apiKey = credentials.apiKey;

      const result = await getUsers({
        apiKey,
        page,
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
        name: 'openai/users.sync.requested',
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

    return { status: 'completed' };
  }
);
