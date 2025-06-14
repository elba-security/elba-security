import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/1password-scim/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: '1password-scim',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.ONEPASSWORD_SCIM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    apiKey: connection.credentials.apiKey,
    scimBridgeUrl: connection.connection_config.scimBridgeUrl as string,
    startIndex: cursor ? parseInt(cursor) : 1,
    count: env.ONEPASSWORD_SCIM_USERS_SYNC_BATCH_SIZE,
  });

  return {
    users: result.users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      additionalEmails: [],
      isSuspendable: true,
      url: (connection.connection_config.webUrl as string) || 'https://my.1password.com',
    })),
    cursor: result.nextStartIndex ? String(result.nextStartIndex) : null,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({
      apiKey: connection.credentials.apiKey,
      scimBridgeUrl: connection.connection_config.scimBridgeUrl as string,
      userId: id,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  // Validate by trying to fetch users with a small limit
  await getUsers({
    apiKey: connection.credentials.apiKey,
    scimBridgeUrl: connection.connection_config.scimBridgeUrl as string,
    startIndex: 1,
    count: 1,
  });
});
