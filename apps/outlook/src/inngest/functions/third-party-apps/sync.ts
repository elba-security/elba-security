import { eq } from 'drizzle-orm/sql';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema/organisations';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/microsoft/user';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';
import { getToken } from '@/connectors/microsoft/auth';

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

    const { validUsers: users, nextSkipToken } = await step.run('list-users', async () => {
      const { token } = await getToken(tenantId);
      return await getUsers({
        tenantId,
        skipToken: pageToken,
        token,
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
            tenantId,
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
