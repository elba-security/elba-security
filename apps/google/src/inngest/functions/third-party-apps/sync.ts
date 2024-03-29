import { asc, eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import type { GoogleToken } from '@/connectors/google/tokens';
import { listGoogleTokens } from '@/connectors/google/tokens';
import { formatApps } from '@/connectors/elba/third-party-apps';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env/server';
import { getOrganisation } from '../common/get-organisation';

export type SyncThirdPartyAppsEvents = {
  'google/third_party_apps.sync.requested': SyncThirdPartyAppsRequested;
};

type SyncThirdPartyAppsRequested = {
  data: {
    organisationId: string;
    isFirstSync: boolean;
    syncStartedAt: string;
    pageToken: number | null;
  };
};

export const syncThirdPartyApps = inngest.createFunction(
  {
    id: 'google-sync-third-party-apps',
    retries: 3,
    concurrency: {
      limit: env.THIRD_PARTY_APPS_CONCURRENCY,
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
  { event: 'google/third_party_apps.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt } = event.data;
    const pageToken = event.data.pageToken ?? 0;

    const { region, googleAdminEmail } = await step.invoke('get-organisation', {
      function: getOrganisation,
      data: { organisationId, columns: ['region', 'googleAdminEmail'] },
    });

    const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);

    const { userIds, nextPageToken: nextPage } = await step.run('list-users', async () => {
      const users = await db.query.usersTable.findMany({
        where: eq(usersTable.organisationId, organisationId),
        orderBy: asc(usersTable.id),
        offset: pageToken,
        limit: env.THIRD_PARTY_APPS_BATCH_SIZE,
        columns: {
          id: true,
        },
      });

      return {
        userIds: users.map(({ id }) => id),
        nextPageToken: users.length ? pageToken + users.length : null,
      };
    });

    const elba = getElbaClient({ organisationId, region });

    if (!userIds.length) {
      await elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt });

      return { status: 'completed' };
    }

    const results = await Promise.allSettled(
      userIds.map(async (userId) =>
        step.run(`list-user-${userId}-apps`, async () => {
          const apps = await listGoogleTokens({ auth: authClient, userKey: userId });

          return { userId, apps };
        })
      )
    );

    const usersApps: { userId: string; apps: GoogleToken[] }[] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        usersApps.push(result.value);
      } else {
        logger.error('Failed to list user apps', {
          organisationId,
          userId: userIds[index],
          error: result.reason, // eslint-disable-line @typescript-eslint/no-unsafe-assignment -- to log error
        });
      }
    }

    await step.run('finalize', async () => {
      const apps = formatApps(usersApps);

      await elba.thirdPartyApps.updateObjects({ apps });
    });

    await step.sendEvent('sync-apps', {
      name: 'google/third_party_apps.sync.requested',
      data: {
        ...event.data,
        pageToken: nextPage,
      },
    });

    return { status: 'ongoing' };
  }
);
