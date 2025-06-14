import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getOrganization } from '@/connectors/adobe/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'adobe',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.ADOBE_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  // Adobe UMAPI requires both access token and API key
  // The API key should be stored in the connection metadata
  const accessToken = connection.credentials.access_token;
  const apiKey = connection.metadata?.apiKey as string | undefined;

  if (!apiKey) {
    throw new Error(
      'API key is required for Adobe UMAPI. Please ensure it is configured in the connection metadata.'
    );
  }

  // Get organization ID first if not in metadata
  let organizationId = connection.metadata?.organizationId as string | undefined;

  if (!organizationId) {
    const org = await getOrganization(accessToken, apiKey);
    organizationId = org.orgId;
  }

  // Fetch users with pagination
  const result = await getUsers({
    accessToken,
    apiKey,
    organizationId,
    page: cursor ? parseInt(cursor, 10) : 0,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email,
      email: user.email,
      additionalEmails: [],
      isSuspendable: true,
      url: undefined,
    })),
    cursor: result.nextPage?.toString() || null,
  };
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  const accessToken = connection.credentials.access_token;
  const apiKey = connection.metadata?.apiKey as string | undefined;

  if (!apiKey) {
    throw new Error(
      'API key is required for Adobe UMAPI. Please ensure it is configured in the connection metadata.'
    );
  }

  // Validate by fetching organization info
  await getOrganization(accessToken, apiKey);
});
