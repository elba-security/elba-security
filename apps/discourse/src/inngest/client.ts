import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/discourse/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'discourse',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.DISCOURSE_USERS_SYNC_CRON);
elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    apiKey: connection.credentials.apiKey,
    // eslint-disable-next-line -- we have to define the type manually 
    defaultHost: connection.connection_config.defaultHost,
    // eslint-disable-next-line -- we have to define the type manually 
    apiUsername: connection.connection_config.apiUsername,
    page: cursor ? parseInt(cursor, 10) : 1,
  });
  // eslint-disable-next-line -- we have to define the type manually 
  const defaultHost = connection.connection_config.defaultHost;

  return {
    users: result.validUsers.map((user) => ({
      id: String(user.id),
      displayName: user.username,
      email: user.email ?? undefined,
      additionalEmails: [],
      url: `https://${defaultHost}.discourse.group/admin/users/${user.id}/${user.username}`,
      isSuspendable: user.can_be_deleted,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({
      apiKey: connection.credentials.apiKey,
      // eslint-disable-next-line -- we have to define the type manually 
      defaultHost: connection.connection_config.defaultHost,
      // eslint-disable-next-line -- we have to define the type manually 
      apiUsername: connection.connection_config.apiUsername,
      userId: id,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getUsers({
    apiKey: connection.credentials.apiKey,
    // eslint-disable-next-line -- we have to define the type manually 
    defaultHost: connection.connection_config.defaultHost,
    // eslint-disable-next-line -- we have to define the type manually 
    apiUsername: connection.connection_config.apiUsername,
    page: null,
  });
});
