import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { type MiroUser, getUsers, getTokenInfo } from '@/connectors/miro/users';

type User = UpdateUsers['users'][number];

const formatElbaUser = ({ orgId, user }: { orgId: string; user: MiroUser }): User => ({
  id: user.id,
  displayName: user.email,
  email: user.email,
  additionalEmails: [],
  isSuspendable: true,
  url: `https://miro.com/app/settings/company/${orgId}/users/`,
});

export const elbaInngestClient = new ElbaInngestClient({
  name: 'miro',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
  env.MIRO_USERS_SYNC_CRON
);

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, organisationId, cursor }) => {
    const orgId = await getTokenInfo(connection.credentials.access_token);

    const result = await getUsers({
      accessToken: connection.credentials.access_token,
      orgId,
      page: cursor,
    });

    const users = result.validUsers.map((user) => formatElbaUser({ orgId, user }));

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }

    return {
      users,
      cursor: result.nextPage ?? undefined,
    };
  }
);

export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async () => {
    // Miro API doesn't provide a user deletion endpoint
    // Users can only be managed through the Miro dashboard
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection }) => {
    await getTokenInfo(connection.credentials.access_token);
  }
);
