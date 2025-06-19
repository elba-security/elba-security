import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser, deleteUser } from '@/connectors/tableau/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'tableau',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.TABLEAU_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  // Get server URL and site ID from connection metadata
  const serverUrl = connection.metadata?.serverUrl as string;
  const siteId = connection.metadata?.siteId as string;

  if (!serverUrl || !siteId) {
    throw new Error('Missing required connection metadata: serverUrl or siteId');
  }

  const { authUserId } = await getAuthUser(serverUrl, siteId, connection.credentials.apiKey);

  const result = await getUsers({
    serverUrl,
    siteId,
    accessToken: connection.credentials.apiKey,
    page: cursor,
  });

  const adminRoles = [
    'ServerAdministrator',
    'SiteAdministratorCreator',
    'SiteAdministratorExplorer',
  ];

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.fullName || user.name,
      email: user.email,
      additionalEmails: [],
      isSuspendable: user.id !== authUserId && !adminRoles.includes(user.siteRole),
      url: `${serverUrl}/#/site/${siteId}/users/${user.id}`,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const serverUrl = connection.metadata?.serverUrl as string;
    const siteId = connection.metadata?.siteId as string;

    if (!serverUrl || !siteId) {
      throw new Error('Missing required connection metadata: serverUrl or siteId');
    }

    await deleteUser({
      serverUrl,
      siteId,
      accessToken: connection.credentials.apiKey,
      userId: id,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  const serverUrl = connection.metadata?.serverUrl as string;
  const siteId = connection.metadata?.siteId as string;

  if (!serverUrl || !siteId) {
    throw new Error('Missing required connection metadata: serverUrl or siteId');
  }

  await getAuthUser(serverUrl, siteId, connection.credentials.apiKey);
});
