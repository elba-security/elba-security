import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser } from '@/connectors/{{name}}/users';

export const elbaInngestClient = new ElbaInngestClient({
  name: '{{name}}',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.{{upper name}}_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  // TODO: Replace with your source-specific user fetching logic
  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    page: cursor,
  });

  return {
    // TODO: Properly format user with your source-specific user details
    users: result.validUsers.map(({ user }) => ({ id: user.id, displayName: user.name })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  await getAuthUser(connection.credentials.access_token);
});
