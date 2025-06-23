import { ElbaInngestClient } from '@elba-security/inngest';
import { env } from '@/common/env';
import { getUsers, getAuthUser } from '@/connectors/typeform/users';
import { removeUserFromAllWorkspaces } from '@/connectors/typeform/members';

export const elbaInngestClient = new ElbaInngestClient({
  name: 'typeform',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

elbaInngestClient.createElbaUsersSyncSchedulerFn(env.TYPEFORM_USERS_SYNC_CRON);

elbaInngestClient.createElbaUsersSyncFn(async ({ connection, cursor }) => {
  // Determine if EU data center based on connection metadata
  const isEuDataCenter = connection.metadata?.region === 'eu';

  const result = await getUsers({
    accessToken: connection.credentials.access_token,
    isEuDataCenter,
    page: cursor,
  });

  return {
    users: result.validUsers.map((member) => ({
      id: member.email,
      displayName: member.name || member.email,
      email: member.email,
      metadata: {
        role: member.role,
        workspaceId: member.workspaceId,
        workspaceName: member.workspaceName,
      },
      isSuspendable: member.role !== 'owner',
    })),
    cursor: result.nextPage,
  };
});

elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const isEuDataCenter = connection.metadata?.region === 'eu';
    await removeUserFromAllWorkspaces({
      accessToken: connection.credentials.access_token,
      userEmail: id,
      isEuDataCenter,
    });
  },
});

elbaInngestClient.createInstallationValidateFn(async ({ connection }) => {
  const isEuDataCenter = connection.metadata?.region === 'eu';
  await getAuthUser(connection.credentials.access_token, isEuDataCenter);
});
