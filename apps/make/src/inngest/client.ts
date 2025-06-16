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

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.MAKE_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const { authUserId } = await getAuthUser(connection.credentials.apiKey);

  // Get all organizations the user has access to
  const organizations = await getOrganizations(connection.credentials.apiKey);

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
      accessToken: connection.credentials.apiKey,
      organizationId: String(org.id),
      page,
    });

    for (const user of result.validUsers) {
      allUsers.push({
        id: String(user.id),
        displayName: user.name,
        email: user.email,
        additionalEmails: [],
        isSuspendable:
          String(user.id) !== authUserId &&
          !user.roles.some((role) => ['Owner', 'Admin'].includes(role.role)),
        url: `${env.MAKE_API_BASE_URL.replace('/api/v2', '')}/organization/${org.id}/users/${
          user.id
        }`,
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
    // Get organizations to find which one the user belongs to
    const organizations = await getOrganizations(connection.credentials.apiKey);

    // Try to remove user from all organizations they might be in
    for (const org of organizations) {
      try {
        await removeUserFromOrganization({
          accessToken: connection.credentials.apiKey,
          userId: id,
          organizationId: String(org.id),
        });
      } catch (error) {
        // Continue if user not found in this org
      }
    }
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getAuthUser(connection.credentials.apiKey);
});
