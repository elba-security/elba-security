import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser, deactivateUser } from '@/connectors/zoom/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'zoom',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.ZOOM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const { authUserId } = await getAuthUser(connection.credentials.access_token);

  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    page: cursor,
  });

  const roles = {
    owner: '0',
    admin: '1',
  };

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.display_name,
      email: user.email,
      additionalEmails: [],
      isSuspendable:
        authUserId !== user.id && user.role_id !== roles.owner && user.role_id !== roles.admin,
      url: `https://zoom.us/user/${user.id}/profile`,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deactivateUser({ accessToken: connection.credentials.access_token, userId: id });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getAuthUser(connection.credentials.access_token);
});
