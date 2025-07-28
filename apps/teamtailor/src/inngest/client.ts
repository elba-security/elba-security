import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, validateApiKey } from '@/connectors/teamtailor/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'teamtailor',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.TEAMTAILOR_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    accessToken: connection.credentials.apiKey,
    page: cursor,
  });

  return {
    users: result.validUsers.map((user) => ({
      id: user.id,
      displayName: user.attributes.name || user.attributes.email,
      email: user.attributes.email,
      additionalEmails: [],
      isSuspendable: user.attributes.role !== 'recruitment_admin',
      metadata: {
        role: user.attributes.role,
        title: user.attributes.title,
        visible: user.attributes.visible,
      },
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await validateApiKey(connection.credentials.apiKey);
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const { deleteUser } = await import('@/connectors/teamtailor/users');
    await deleteUser(connection.credentials.apiKey, id);
  },
});
