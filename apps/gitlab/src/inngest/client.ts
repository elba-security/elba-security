import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser, deactivateUser } from '@/connectors/gitlab/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'gitlab',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.GITLAB_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    page: cursor,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: String(user.id),
      displayName: user.name,
      email: user.email || undefined,
      url: user.web_url,
      // Mark admin users as non-suspendable
      isSuspendable: !user.is_admin,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getAuthUser(connection.credentials.access_token);
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deactivateUser(connection.credentials.access_token, id);
  },
});
