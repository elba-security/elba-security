import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { getUsers, deleteUser, getTokenInfo, getAuthUser } from '@/connectors/gusto/users';

type User = UpdateUsers['users'][number];

const formatElbaUser = (user: {
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
}): User => ({
  id: user.uuid,
  email: user.email,
  displayName: `${user.first_name} ${user.last_name}`.trim(),
  additionalEmails: [],
  isSuspendable: true,
});

export const elbaInngestClient = new ElbaInngestClient({
  name: 'gusto',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
  env.GUSTO_USERS_SYNC_CRON
);

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, cursor }) => {
    const accessToken = connection.credentials.access_token;
    const page = cursor ? Number(cursor) : 1;

    // Get company ID and admin ID from token info
    const { companyId, adminId } = await getTokenInfo(accessToken);

    // Get the authenticated user's email to exclude from sync
    const { authUserEmail } = await getAuthUser({ accessToken, adminId, companyId });

    const { validUsers, invalidUsers, nextPage } = await getUsers({
      accessToken,
      companyId,
      page,
    });

    if (invalidUsers.length > 0) {
      logger.warn('Invalid users found', { invalidUsers });
    }

    // Filter out the authenticated user and format users for Elba
    const users = validUsers
      .filter((user) => user.email !== authUserEmail)
      .map((user) => ({
        ...formatElbaUser(user),
        isSuspendable: true,
      }));

    return {
      users,
      cursor: nextPage ? String(nextPage) : null,
    };
  }
);

export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const accessToken = connection.credentials.access_token;
    await deleteUser({ accessToken, userId: id });
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection }) => {
    const accessToken = connection.credentials.access_token;
    try {
      await getTokenInfo(accessToken);
    } catch (error) {
      throw new NonRetriableError('Invalid Gusto installation', { cause: error });
    }
  }
);
