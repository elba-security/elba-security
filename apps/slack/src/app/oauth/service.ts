import { SlackAPIClient } from 'slack-web-api-client';
import { logger } from '@elba-security/logger';
import { encrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { getSlackMissingScopes } from '@/connectors/slack/oauth';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { slackTeamSchema } from '@/connectors/slack/teams';
import { inngest } from '@/inngest/client';

export const handleSlackInstallation = async ({
  organisationId,
  region,
  code,
}: {
  organisationId: string;
  region: string;
  code: string;
}) => {
  const slackClient = new SlackAPIClient();
  let accessToken: string | undefined;
  try {
    const response = await slackClient.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
    });

    // TODO: remove me
    logger.info('slack oauth response', response);

    if (!response.authed_user?.access_token) {
      throw new Error('No access token provided');
    }

    accessToken = response.authed_user.access_token;

    if (response.authed_user.token_type !== 'user') {
      throw new Error('Unsupported token type');
    }

    if (!response.authed_user.scope) {
      throw new Error('No scopes provided');
    }

    const missingScopes = getSlackMissingScopes(response.authed_user.scope);
    if (missingScopes.length) {
      // TODO: log
      throw new Error('Missing OAuth scopes');
    }

    if (response.is_enterprise_install) {
      throw new Error('Slack enterprise is not supported');
    }

    // TODO: is admin

    const { team } = await slackClient.team.info({
      token: accessToken,
    });

    const result = slackTeamSchema.safeParse(team);
    if (!result.success) {
      throw new Error('Failed to retrieve team info');
    }

    const encryptedToken = await encrypt(accessToken);

    await db
      .insert(teams)
      .values({
        id: result.data.id,
        elbaOrganisationId: organisationId,
        elbaRegion: region,
        url: result.data.url,
        token: encryptedToken,
      })
      .onConflictDoUpdate({
        target: [teams.id],
        set: {
          url: result.data.url,
          token: encryptedToken,
        },
      });

    await inngest.send({
      name: 'users/synchronize',
      data: {
        teamId: result.data.id,
        isFirstSync: true,
        syncStartedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (accessToken) {
      await slackClient.apps.uninstall({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        token: accessToken,
      });
    }

    throw error;
  }
};
