import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser, deleteUser } from '@/connectors/box/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'box',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.BOX_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const { authUserId } = await getAuthUser(connection.credentials.access_token);

  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    page: cursor,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.name,
      email: user.login,
      additionalEmails: [],
      isSuspendable: String(user.id) !== authUserId,
      url: `https://app.box.com/master/users/${user.id}`,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({ accessToken: connection.credentials.access_token, userId: id });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getAuthUser(connection.credentials.access_token);
});
