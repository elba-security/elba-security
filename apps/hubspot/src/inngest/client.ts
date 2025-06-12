import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import {
  deleteUser,
  getUsers,
  getAuthUser,
  getAccountInfo,
  type HubspotUser,
} from '@/connectors/hubspot/users';

type User = UpdateUsers['users'][number];

type AccountInfo = {
  timeZone: string;
  portalId: number;
  uiDomain: string;
};

const formatElbaUser = ({
  user,
  authUserId,
  accountInfo,
}: {
  user: HubspotUser;
  authUserId: string;
  accountInfo: AccountInfo;
}): User => {
  return {
    id: user.id,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    email: user.email,
    url: `https://${accountInfo.uiDomain}/settings/${accountInfo.portalId}/users/${user.id}`,
    isSuspendable: !user.superAdmin && user.id !== authUserId,
  };
};

export const elbaInngestClient = new ElbaInngestClient({
  name: 'hubspot',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
  env.HUBSPOT_USERS_SYNC_CRON
);

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, organisationId, cursor }) => {
    if (!connection.credentials.access_token) {
      throw new NonRetriableError(`No access token found for organisationId: ${organisationId}`);
    }

    const { authUserId } = await getAuthUser(connection.credentials.access_token);
    const accountInfo = await getAccountInfo(connection.credentials.access_token);

    const { validUsers, invalidUsers, nextPage } = await getUsers({
      accessToken: connection.credentials.access_token,
      page: cursor,
    });

    if (invalidUsers.length > 0) {
      logger.warn('Retrieved invalid users from hubspot', {
        organisationId,
        invalidUsers,
      });
    }

    const users = validUsers.map((user) => formatElbaUser({ user, authUserId, accountInfo }));

    return {
      users,
      cursor: nextPage,
    };
  }
);

export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    if (!connection.credentials.access_token) {
      throw new NonRetriableError(`No access token found for user deletion`);
    }

    await deleteUser({
      accessToken: connection.credentials.access_token,
      userId: id,
    });
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection, organisationId }) => {
    if (!connection.credentials.access_token) {
      throw new NonRetriableError(`No access token found for organisationId: ${organisationId}`);
    }

    await getAuthUser(connection.credentials.access_token);
  }
);
