import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { getGrantsForUser, revokeGrant } from '@/connectors/okta/third-party-apps';

export const deleteThirdPartyApp = inngest.createFunction(
  {
    id: 'okta-delete-third-party-app',
    retries: 5,
  },
  { event: 'okta/third_party_apps.delete.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, appId, userId } = event.data;

    await step.run('delete-third-party-app', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const subDomain = nangoConnectionConfigResult.data.subdomain;
      const token = credentials.access_token;

      // Get all grants for this user to find the specific one
      const grants = await getGrantsForUser({
        token,
        subDomain,
        userId,
      });

      // Find the grant for this specific app
      const grant = grants.find((g) => g.clientId === appId);

      if (!grant) {
        logger.info('Grant not found, possibly already revoked', {
          organisationId,
          appId,
          userId,
        });
        return;
      }

      // Revoke the grant
      await revokeGrant({
        token,
        subDomain,
        userId,
        grantId: grant.id,
      });

      logger.info('Successfully revoked grant', {
        organisationId,
        appId,
        userId,
        grantId: grant.id,
      });
    });

    return {
      status: 'completed',
    };
  }
);
