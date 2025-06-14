import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { z } from 'zod';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/sentry/users';

type User = UpdateUsers['users'][number];

const formatElbaUser = (user: {
  id: string;
  name: string;
  email: string;
  orgRole: string;
  user: { has2fa: boolean } | null;
}): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: user.orgRole,
  isSuspendable: user.orgRole !== 'owner',
  additionalEmails: [],
});

export const elbaInngestClient = new ElbaInngestClient({
  name: 'sentry',
  nangoAuthType: 'OAUTH2',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});

export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
  env.SENTRY_USERS_SYNC_CRON
);

const connectionConfigSchema = z.object({
  organization: z.object({
    slug: z.string(),
  }),
});

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, organisationId, cursor }) => {
    const config = connectionConfigSchema.parse(connection.connection_config);
    const organizationSlug = config.organization.slug;
    const accessToken = connection.credentials.access_token;

    const { validUsers, invalidUsers, nextPage } = await getUsers({
      accessToken,
      cursor,
      organizationSlug,
    });

    if (invalidUsers.length > 0) {
      logger.warn('Invalid users found', {
        organisationId,
        invalidUsers,
      });
    }

    const users = validUsers
      .filter((user) => !user.pending && user.user?.isActive)
      .map(formatElbaUser);

    return { users, cursor: nextPage };
  }
);

export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
  isBatchDeleteSupported: false,
  deleteUsersFn: async ({ connection, id }) => {
    const config = connectionConfigSchema.parse(connection.connection_config);
    const organizationSlug = config.organization.slug;
    const accessToken = connection.credentials.access_token;

    await deleteUser({
      accessToken,
      userId: id,
      organizationSlug,
    });
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection, organisationId }) => {
    const config = connectionConfigSchema.parse(connection.connection_config);
    const organizationSlug = config.organization.slug;
    const accessToken = connection.credentials.access_token;

    try {
      await getUsers({
        accessToken,
        organizationSlug,
      });
    } catch (error) {
      logger.error('Failed to validate installation', {
        organisationId,
        error,
      });
      throw new NonRetriableError('Failed to validate installation');
    }
  }
);
