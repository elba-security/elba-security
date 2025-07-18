import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { getGrantsForUser } from '@/connectors/okta/third-party-apps';
import { formatThirdPartyApps } from '@/connectors/okta/third-party-apps-transformer';

export const refreshThirdPartyApp = inngest.createFunction(
  {
    id: 'okta-refresh-third-party-app',
    retries: 5,
  },
  { event: 'okta/third_party_apps.refresh.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, region, appId, userId } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    await step.run('refresh-third-party-app', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const subDomain = nangoConnectionConfigResult.data.subdomain;
      const token = credentials.access_token;

      // Get all grants for this user
      const grants = await getGrantsForUser({
        token,
        subDomain,
        userId,
      });

      // Find the specific grant for this app
      const appGrant = grants.find((grant) => grant.clientId === appId);

      if (!appGrant) {
        // Grant no longer exists, delete it from Elba
        logger.info('Grant not found, deleting from Elba', {
          organisationId,
          appId,
          userId,
        });

        await elba.thirdPartyApps.deleteObjects({
          ids: [{ appId, userId }],
        });
        return;
      }

      // Transform all user's grants to get the complete app object
      const apps = await formatThirdPartyApps({
        grants: [{ userId, grants }],
        token,
        subDomain,
      });

      // Find the specific app we're refreshing
      const app = apps.find((a) => a.id === appId);

      if (!app) {
        logger.warn('Could not format app after finding grant', {
          organisationId,
          appId,
          userId,
        });
        return;
      }

      // Update the app in Elba
      await elba.thirdPartyApps.updateObjects({
        apps: [app],
      });
    });

    return {
      status: 'completed',
    };
  }
);
