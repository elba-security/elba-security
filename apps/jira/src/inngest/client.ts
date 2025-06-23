import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { type JiraUser, getUsers, deleteUser, getAuthUser } from '@/connectors/jira/users';

type User = UpdateUsers['users'][number];

// Helper function to extract domain from Nango connection
const extractDomain = (connection: { connection_config?: unknown; metadata?: unknown }): string => {
  // Check connection_config first (from OAuth flow)
  if (connection.connection_config && typeof connection.connection_config === 'object') {
    const config = connection.connection_config as Record<string, unknown>;
    const siteUrl = config.siteUrl;
    if (typeof siteUrl === 'string') {
      const match = /https:\/\/(?<domain>[^.]+)\.atlassian\.net/.exec(siteUrl);
      if (!match?.groups?.domain) {
        throw new Error('Invalid Jira site URL format');
      }
      return match.groups.domain;
    }
  }

  // Check metadata (fallback)
  if (connection.metadata && typeof connection.metadata === 'object') {
    const metadata = connection.metadata as Record<string, unknown>;
    const domain = metadata.domain;
    if (typeof domain === 'string') {
      return domain;
    }
  }

  throw new Error('Missing required Jira domain information');
};

const formatElbaUser = ({
  user,
  domain,
  authUserId,
}: {
  user: JiraUser;
  domain: string;
  authUserId: string;
}): User => ({
  id: user.accountId,
  displayName: user.displayName,
  email: user.emailAddress,
  additionalEmails: [],
  isSuspendable: String(user.accountId) !== authUserId,
  url: `https://${domain}.atlassian.net/jira/people/${user.accountId}`,
});

export const elbaInngestClient = new ElbaInngestClient({
  name: 'jira',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
  env.JIRA_USERS_SYNC_CRON
);

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, organisationId, cursor }) => {
    const domain = extractDomain(connection);

    // Get the authenticated user's ID for marking non-suspendable users
    const authUser = await getAuthUser({
      accessToken: connection.credentials.access_token,
      domain,
    });
    const authUserId = authUser.authUserId;

    const result = await getUsers({
      accessToken: connection.credentials.access_token,
      domain,
      page: cursor,
    });

    const users = result.validUsers.map((user) => formatElbaUser({ user, domain, authUserId }));

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }

    return {
      users,
      cursor: result.nextPage?.toString() ?? undefined,
    };
  }
);

export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const domain = extractDomain(connection);

    await deleteUser({
      userId: id,
      domain,
      accessToken: connection.credentials.access_token,
    });
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection }) => {
    const domain = extractDomain(connection);

    // Validate the OAuth token and get auth user info
    // This will throw if the token is invalid
    await getAuthUser({
      accessToken: connection.credentials.access_token,
      domain,
    });
  }
);
