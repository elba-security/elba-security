import type { User } from '@elba-security/sdk';
import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { checkUserIsAdmin, listGoogleUsers } from '@/connectors/google/users';
import { formatUser } from '@/connectors/elba/users';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env/server';
import { getOrganisation } from '../common/get-organisation';

export type SyncUsersEvents = {
  'gmail/users.sync.requested': SyncUsersRequested;
};

type SyncUsersRequested = {
  data: {
    organisationId: string;
    isFirstSync: boolean;
    syncStartedAt: string;
    pageToken: string | null;
  };
};

export const syncUsers = inngest.createFunction(
  {
    id: 'gmail-sync-users',
    retries: 3,
    concurrency: {
      limit: env.USERS_SYNC_CONCURRENCY,
      key: 'event.data.isFirstSync',
    },
    cancelOn: [
      {
        event: 'gmail/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'gmail/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'gmail/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, pageToken } = event.data;

    const { region, googleAdminEmail, googleCustomerId } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail', 'googleCustomerId'] },
    });

    const { users, nextPageToken: nextPage } = await step.run('list-users', async () => {
      const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);

      await checkUserIsAdmin({ userId: googleAdminEmail, auth: authClient });

      return listGoogleUsers({
        auth: authClient,
        customer: googleCustomerId,
        pageToken: pageToken ?? undefined,
        maxResults: env.USERS_SYNC_BATCH_SIZE,
      });
    });

    const elba = getElbaClient({ organisationId, region });

    await step.run('update-elba-users', async () => {
      const elbaUsers: User[] = users.map((user) => formatUser(user));

      await elba.users.update({ users: elbaUsers });
    });

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'gmail/users.sync.requested',
        data: {
          ...event.data,
          pageToken: nextPage,
        },
      });

      return { status: 'ongoing' };
    }

    await elba.users.delete({ syncedBefore: syncStartedAt });

    return { status: 'completed' };
  }
);
