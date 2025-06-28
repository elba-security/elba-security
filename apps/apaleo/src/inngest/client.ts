import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deactivateUser } from '@/connectors/apaleo/users';
import type { ApaleoUser } from '@/connectors/apaleo/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'apaleo',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.APALEO_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection }) => {
  const result = await getUsers(connection.credentials.access_token);
  const formatElbaUserDisplayName = (user: ApaleoUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };
  return {
    users: result.validUsers.map((user) => ({
      id: user.subjectId,
      displayName: formatElbaUserDisplayName(user),
      email: user.email,
      additionalEmails: [],
      isSuspendable: true,
      url: `https://app.apaleo.com/account/user-management/user/${user.subjectId}`,
    })),
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deactivateUser({ accessToken: connection.credentials.access_token, userId: id });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getUsers(connection.credentials.access_token);
});
