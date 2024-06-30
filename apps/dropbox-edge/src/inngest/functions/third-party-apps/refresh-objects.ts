import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getOrganisation } from '@/database/organisations';
import { createElbaClient } from '@/connectors/elba/client';
import { getMemberLinkedApps } from '@/connectors/dropbox/apps';
import { formatThirdPartyObjects } from '@/connectors/elba/third-party-apps';

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
    const { organisationId, appId, userId } = event.data;

    const organisation = await getOrganisation(organisationId);

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);

    await step.run('list-apps', async () => {
      const { apps } = await getMemberLinkedApps({
        accessToken,
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
