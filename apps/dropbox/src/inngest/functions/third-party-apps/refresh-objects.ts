import { inngest } from '@/inngest/client';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { getMemberLinkedApps } from '@/connectors/dropbox/apps';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { formatThirdPartyObjects } from '@/connectors/elba/third-party-apps';
import { nangoAPIClient } from '@/common/nango';

export const refreshThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'dropbox-third-party-apps-refresh-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
    concurrency: {
      limit: env.DROPBOX_TPA_REFRESH_OBJECT_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.refresh_objects.requested' },
  async ({ step, event }) => {
    const { organisationId, appId, userId, nangoConnectionId, region } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    
    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    await step.run('list-apps', async () => {
      const { apps } = await getMemberLinkedApps({
        accessToken: credentials.access_token,
        teamMemberId: userId,
      });

      const formattedApps = Array.from(
        formatThirdPartyObjects([
          {
            team_member_id: userId,
            linked_api_apps: apps,
          },
        ]).values()
      );

      const hasRequestedApp = formattedApps.some((app) => app.id === appId);

      if (!apps.length || !hasRequestedApp) {
        await elba.thirdPartyApps.deleteObjects({
          ids: [
            {
              userId,
              appId,
            },
          ],
        });
        // Abort refresh when the user does not have any linked apps
        // but it should be refreshed if the user has other linked apps even if the requested app is not found
        if (!apps.length) return;
      }

      if (formattedApps.length > 0) {
        await elba.thirdPartyApps.updateObjects({
          apps: formattedApps,
        });
      }
    });
  }
);
