import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser, getWorkspaceName } from '@/connectors/segment/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'segment',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.SEGMENT_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const { workspaceName } = await getWorkspaceName({
    accessToken: connection.credentials.access_token,
  });

  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    cursor,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.name,
      email: user.email,
      additionalEmails: [],
      // The auth user email is not available from the API, so we can't mark them as non-suspendable
      isSuspendable: true,
      url: `https://app.segment.com/${workspaceName}/settings/access-management/users/${user.id}/edit`,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({
      accessToken: connection.credentials.access_token,
      userId: id,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  // Validate the token by attempting to get workspace name
  await getWorkspaceName({ accessToken: connection.credentials.access_token });
});
