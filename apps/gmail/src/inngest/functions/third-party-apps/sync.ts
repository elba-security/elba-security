import { eq } from 'drizzle-orm/sql';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { checkUserIsAdmin, listGoogleUsers } from '@/connectors/google/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema/organisations';
import { inngest } from '@/inngest/client';

export type SyncThirdPartyAppsRequested = {
  'gmail/third_party_apps.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      googleAdminEmail: string;
      googleCustomerId: string;
      syncStartedAt: string;
      lastSyncStartedAt: string | null;
      pageToken: string | null;
    };
  };
};

export const syncThirdPartyApps = inngest.createFunction(
  {
    id: 'sync-third-party-apps',
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
  {
    event: 'gmail/third_party_apps.sync.requested',
  },
  async ({ event, step }) => {
    const {
      googleAdminEmail,
      googleCustomerId,
      pageToken,
      organisationId,
      region,
      lastSyncStartedAt,
      syncStartedAt,
    } = event.data;

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

    const { users, nextPageToken } = await step.run('list-users', async () => {
      const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);

      await checkUserIsAdmin({ userId: googleAdminEmail, auth: authClient });

      return await listGoogleUsers({
        auth: authClient,
        customer: googleCustomerId,
        pageToken: pageToken ?? undefined,
        maxResults: 500,
        fields: 'users/id,users/primaryEmail,nextPageToken',
      });
    });

    if (users.length > 0) {
      await step.sendEvent(
        'sync-inboxes',
        users.map((user) => ({
          name: 'gmail/third_party_apps.inbox.sync.requested',
          data: {
            organisationId,
            googleAdminEmail,
            region,
            userId: user.id,
            email: user.primaryEmail,
            pageToken: null,
            syncFrom: lastSyncStartedAt,
            syncTo: syncStartedAt,
          },
        }))
      );
    }

    if (nextPageToken) {
      await step.sendEvent('sync-next-page', {
        name: 'gmail/third_party_apps.sync.requested',
        data: {
          ...event.data,
          pageToken: nextPageToken,
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
