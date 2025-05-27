import { env } from '@/common/env';
import { getLinkedApps } from '@/connectors/dropbox/apps';
import { formatThirdPartyObjects } from '@/connectors/elba/third-party-apps';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

export const syncApps = inngest.createFunction(
  {
    id: 'dropbox-sync-apps',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'dropbox/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'dropbox/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
    concurrency: {
      limit: env.DROPBOX_TPA_SYNC_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, cursor, syncStartedAt, nangoConnectionId, region } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const accessToken = credentials.access_token;

    const nextCursor = await step.run('list-apps', async () => {
      const { apps, ...rest } = await getLinkedApps({
        accessToken,
        cursor,
      });

      const formattedApps = Array.from(formatThirdPartyObjects(apps).values());

      if (formattedApps.length > 0) {
        await elba.thirdPartyApps.updateObjects({
          apps: formattedApps,
        });
      }

      return rest.nextCursor;
    });

    if (nextCursor) {
      await step.sendEvent('list-next-page-apps', {
        name: 'dropbox/third_party_apps.sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('third-party-apps-sync-finalize', async () => {
      return elba.thirdPartyApps.deleteObjects({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
    });
  }
);
