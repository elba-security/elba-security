import { eq } from 'drizzle-orm/sql';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema/organisations';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/microsoft/user';
import { decrypt } from '@/common/crypto';
import { getToken } from '@/inngest/functions/common/get-token';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';

export type SyncThirdPartyAppsRequested = {
  'outlook/third_party_apps.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      tenantId: string;
      syncStartedAt: string;
      lastSyncStartedAt: string | null;
      pageToken: string | null;
    };
  };
};

export const syncThirdPartyApps = inngest.createFunction(
  {
    id: 'sync-third-party-apps',
    concurrency: concurrencyOption,
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/sync.cancel',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.sync.requested',
  },
  async ({ event, step }) => {
    const { tenantId, pageToken, organisationId, region, lastSyncStartedAt, syncStartedAt } =
      event.data;

    const isFirstPage = !pageToken;

    if (isFirstPage) {
      await step.run('update-last-sync-started-at', async () => {
        return await db
          .update(organisationsTable)
          .set({
            lastSyncStartedAt: new Date(syncStartedAt),
          })
          .where(eq(organisationsTable.id, organisationId));
      });
    }

    const token = await step.invoke('get-token', {
      function: getToken,
      data: {
        organisationId,
      },
      timeout: '1d',
    });

    const { validUsers: users, nextSkipToken } = await step.run('list-users', async () => {
      return await getUsers({
        tenantId,
        skipToken: pageToken,
        token: await decrypt(token),
      });
    });

    if (users.length > 0) {
      await step.sendEvent(
        'sync-messages',
        users.map((user) => ({
          name: 'outlook/third_party_apps.messages.sync.requested',
          data: {
            organisationId,
            region,
            skipStep: null,
            syncFrom: lastSyncStartedAt,
            syncTo: syncStartedAt,
            userId: user.id,
            syncStartedAt,
          },
        }))
      );
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-page', {
        name: 'outlook/third_party_apps.sync.requested',
        data: {
          ...event.data,
          pageToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    return {
      status: 'completed',
    };
  }
);
