import type { User } from '@elba-security/sdk';
import { and, eq, lt, sql } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { listGoogleUsers } from '@/connectors/google/users';
import { formatUser } from '@/connectors/elba/users';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env/server';
import { getOrganisation } from '../common/get-organisation';

export type SyncUsersEvents = {
  'google/users.sync.requested': SyncUsersRequested;
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
    id: 'google-sync-users',
    retries: 3,
    concurrency: {
      limit: env.USERS_SYNC_CONCURRENCY,
      key: 'event.data.isFirstSync',
    },
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'google/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'google/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, pageToken } = event.data;

    const { region, googleAdminEmail, googleCustomerId } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail', 'googleCustomerId'] },
    });

    const { users, nextPageToken: nextPage } = await step.run('list-users', async () => {
      const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);
      return listGoogleUsers({
        auth: authClient,
        customer: googleCustomerId,
        pageToken: pageToken ?? undefined,
        maxResults: env.USERS_SYNC_BATCH_SIZE,
      });
    });

    await step.run('insert-users', async () => {
      await db
        .insert(usersTable)
        .values(
          users.map(({ id, primaryEmail }) => ({
            organisationId,
            id,
            email: primaryEmail,
            lastSyncedAt: syncStartedAt,
          }))
        )
        .onConflictDoUpdate({
          target: [usersTable.organisationId, usersTable.id],
          set: { email: sql`excluded.email`, lastSyncedAt: syncStartedAt },
        });
    });

    const elba = getElbaClient({ organisationId, region });

    await step.run('update-elba-users', async () => {
      const elbaUsers: User[] = users.map((user) => formatUser(user));

      await elba.users.update({ users: elbaUsers });
    });

    if (nextPage) {
      await step.sendEvent('sync-users', {
        name: 'google/users.sync.requested',
        data: {
          ...event.data,
          pageToken: nextPage,
        },
      });

      return { status: 'ongoing' };
    }

    await step.run('delete-users', async () => {
      await db
        .delete(usersTable)
        .where(
          and(
            eq(usersTable.organisationId, organisationId),
            lt(usersTable.lastSyncedAt, syncStartedAt)
          )
        );
    });

    await elba.users.delete({ syncedBefore: syncStartedAt });

    return { status: 'completed' };
  }
);
