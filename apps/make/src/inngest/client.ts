import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import {
  getUsers,
  getAuthUser,
  removeUserFromOrganization,
  getOrganizations,
} from '@/connectors/make/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'make',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

// Type for the connection config
type MakeConnectionConfig = {
  environmentUrl?: string;
};

// Type for the connection object
type MakeConnection = {
  connection_config?: MakeConnectionConfig;
  credentials: {
    apiKey: string;
  };
};

// Helper function to get the API base URL from connection config
const getApiBaseUrl = (connection: MakeConnection): string => {
  // Extract environmentUrl from connection config
  // Expected format: "eu1.make.com" or "us1.make.com" etc.
  const environmentUrl = connection.connection_config?.environmentUrl;

  if (!environmentUrl) {
    throw new Error('Missing environmentUrl in connection configuration');
  }

  // Ensure it has the proper protocol and API path
  const baseUrl = environmentUrl.startsWith('http') ? environmentUrl : `https://${environmentUrl}`;

  return baseUrl.endsWith('/api/v2') ? baseUrl : `${baseUrl}/api/v2`;
};

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.MAKE_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const makeConnection = connection as MakeConnection;
  const baseUrl = getApiBaseUrl(makeConnection);
  const { authUserId } = await getAuthUser(makeConnection.credentials.apiKey, baseUrl);

  // Get all organizations the user has access to
  const organizations = await getOrganizations(makeConnection.credentials.apiKey, baseUrl);

  // For simplicity, we'll sync users from all organizations
  // In a production scenario, you might want to handle this differently
  const allUsers: {
    id: string;
    displayName: string;
    email: string;
    additionalEmails?: string[];
    isSuspendable?: boolean;
    url?: string;
  }[] = [];
  let nextCursor: string | null = null;

  for (const org of organizations) {
    const page = cursor ? parseInt(cursor) : 0;
    const result = await getUsers({
      accessToken: makeConnection.credentials.apiKey,
      organizationId: String(org.id),
      baseUrl,
      page,
      zone: org.zone, // Pass the organization's zone if available
    });

    for (const user of result.validUsers) {
      allUsers.push({
        id: String(user.id),
        displayName: user.name,
        email: user.email,
        additionalEmails: [],
        isSuspendable: String(user.id) !== authUserId,
        // Use zone-specific URL if available, otherwise use base URL
        url: org.zone
          ? `https://${org.zone}/organization/${org.id}/users/${user.id}`
          : `${baseUrl.replace('/api/v2', '')}/organization/${org.id}/users/${user.id}`,
      });
    }

    // If we have a next page for any org, use it as cursor
    if (result.nextPage !== null) {
      nextCursor = String(result.nextPage);
      break; // Process one org at a time when paginating
    }
  }

  return {
    users: allUsers,
    cursor: nextCursor,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const makeConnection = connection as MakeConnection;
    const baseUrl = getApiBaseUrl(makeConnection);

    // Get organizations to find which one the user belongs to
    const organizations = await getOrganizations(makeConnection.credentials.apiKey, baseUrl);

    // Try to remove user from all organizations they might be in
    for (const org of organizations) {
      try {
        await removeUserFromOrganization({
          accessToken: makeConnection.credentials.apiKey,
          userId: id,
          organizationId: String(org.id),
          baseUrl,
        });
      } catch (error) {
        // Continue if user not found in this org
      }
    }
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  const makeConnection = connection as MakeConnection;
  const baseUrl = getApiBaseUrl(makeConnection);
  await getAuthUser(makeConnection.credentials.apiKey, baseUrl);
});
