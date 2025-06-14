import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/figma-scim/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'figma-scim',
  nangoAuthType: 'API_KEY',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.FIGMA_SCIM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  const result = await getUsers({
    apiKey: connection.credentials.apiKey,
    tenantId: connection.connection_config.tenantId as string,
    startIndex: cursor ? parseInt(cursor) : 1,
    count: env.FIGMA_SCIM_USERS_SYNC_BATCH_SIZE,
  });

  return {
    users: result.users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      additionalEmails: [],
      isSuspendable: true,
      url: `${env.FIGMA_SCIM_API_BASE_URL}/files/team/${
        connection.connection_config.tenantId as string
      }/members`,
    })),
    cursor: result.nextStartIndex ? String(result.nextStartIndex) : null,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    await deleteUser({
      apiKey: connection.credentials.apiKey,
      tenantId: connection.connection_config.tenantId as string,
      userId: id,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  // Validate by trying to fetch users with a small limit
  await getUsers({
    apiKey: connection.credentials.apiKey,
    tenantId: connection.connection_config.tenantId as string,
    startIndex: 1,
    count: 1,
  });
});
