import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { getUsers, type OktaUser } from '@/connectors/okta/users';
import { getGrantsForUsers } from '@/connectors/okta/third-party-apps';
import { formatThirdPartyApps } from '@/connectors/okta/third-party-apps-transformer';
import { env } from '@/common/env';

export const syncThirdPartyApps = inngest.createFunction(
  {
    id: 'okta-sync-third-party-apps',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'okta/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'okta/third_party_apps.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, syncStartedAt, region } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    await step.run('sync-third-party-apps', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const subDomain = nangoConnectionConfigResult.data.subdomain;
      const token = credentials.access_token;

      // Fetch all users first to get their grants
      const allUsers: OktaUser[] = [];
      let page: string | null = null;

      // Collect all users
      do {
        const result = await getUsers({
          token,
          subDomain,
          page,
        });
        allUsers.push(...result.validUsers);
        page = result.nextPage;
      } while (page);

      logger.info(`Found ${allUsers.length} users to check for grants`, {
        organisationId,
      });

      // Get grants for all users in batches
      const userGrants = await getGrantsForUsers({
        token,
        subDomain,
        users: allUsers,
        concurrency: env.THIRD_PARTY_APPS_CONCURRENCY || 5,
      });

      // Filter out users with no grants
      const usersWithGrants = userGrants.filter((ug) => ug.grants.length > 0);

      logger.info(`Found ${usersWithGrants.length} users with grants`, {
        organisationId,
      });

      if (usersWithGrants.length === 0) {
        // No grants found, just delete all existing third-party apps
        await elba.thirdPartyApps.deleteObjects({
          syncedBefore: syncStartedAt,
        });
        return;
      }

      // Transform to Elba format
      const apps = await formatThirdPartyApps({
        grants: usersWithGrants,
        token,
        subDomain,
      });

      logger.info(`Syncing ${apps.length} third-party apps`, {
        organisationId,
      });

      if (apps.length > 0) {
        await elba.thirdPartyApps.updateObjects({
          apps,
        });
      }

      // Delete apps that no longer exist
      await elba.thirdPartyApps.deleteObjects({
        syncedBefore: syncStartedAt,
      });
    });

    return {
      status: 'completed',
    };
  }
);
