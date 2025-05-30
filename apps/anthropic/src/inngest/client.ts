import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/anthropic/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'anthropic',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.ANTHROPIC_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    apiKey: connection.credentials.apiKey,
    page: cursor,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.name,
      email: user.email,
      additionalEmails: [],
      isSuspendable: true,
      url: `https://console.anthropic.com/settings/members`,
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({ apiKey: connection.credentials.apiKey, userId: id });
  },
});
