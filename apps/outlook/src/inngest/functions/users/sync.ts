import type { User } from '@elba-security/sdk';
import { env } from '@/common/env/server';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/microsoft/user';
import { getElbaClient } from '@/connectors/elba/client';
import { type MicrosoftUser } from '@/connectors/microsoft/types';
import { getToken } from '@/connectors/microsoft/auth';
import { getOrganisation } from '../common/get-organisation';

export type SyncUsersEvents = {
  'outlook/users.sync.requested': SyncUsersRequested;
};

type SyncUsersRequested = {
  data: {
    organisationId: string;
    isFirstSync: boolean;
    syncStartedAt: number;
    skipToken: string | null;
  };
};

const formatElbaUser = (user: MicrosoftUser): User => ({
  id: user.id,
  email: user.mail || undefined,
  displayName: user.displayName || user.userPrincipalName,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'outlook-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'outlook/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, skipToken, syncStartedAt } = event.data;

    const { region, tenantId } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'tenantId'] },
    });

    const elba = getElbaClient({ organisationId, region });

    const nextSkipToken = await step.run('paginate', async () => {
      const { token } = await getToken(tenantId);
      const result = await getUsers({
        token,
        tenantId,
        skipToken,
      });

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          tenantId,
          invalidUsers: result.invalidUsers,
        });
      }

      await elba.users.update({
        users: result.validUsers.map(formatElbaUser),
      });

      return result.nextSkipToken;
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-users-page', {
        name: 'outlook/users.sync.requested',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }
    await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
    return {
      status: 'completed',
    };
  }
);
