import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { type OpenAiUser, getUsers } from '@/connectors/openai/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

// An organisation can have multiple owners, but only one can be the actual owner.
// Allowing to remove all owners of the organisation would be a security risk.
// therefore, if the admin wants to remove the owner, they can remove it from the OpenAi platform
const formatElbaUser = (user: OpenAiUser): User => ({
  id: user.user.id,
  displayName: user.user.name,
  email: user.user.email,
  role: user.user.role, // 'owner' | 'reader'
  additionalEmails: [],
  isSuspendable: user.user.role !== 'owner',
  url: 'https://platform.openai.com/settings/organization/team',
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

    await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
      if (!nangoCredentialsResult.success) {
        throw new Error('Could not retrieve Nango credentials');
      }

      const apiKey = nangoCredentialsResult.data.apiKey;

      const result = await getUsers({
        apiKey,
        page,
      });
      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.error('Invalid users found', { organisationId, invalidUsers: result.invalidUsers });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }
    });

    // It seems OpenAI doesn't support pagination nor limit.
    // We should keep an eye on this in case they support it in the future.
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return { status: 'completed' };
  }
);
