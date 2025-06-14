import type { UpdateUsers } from '@elba-security/schemas';
import { ElbaInngestClient } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { z } from 'zod';
import { env } from '@/common/env';
import { getUsers, deleteUser } from '@/connectors/sentry/users';
import { getOrganization } from '@/connectors/sentry/organizations';

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
  nangoAuthType: 'API_KEY',
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

// Type for the connection parameter
type Connection = {
  credentials: {
    apiKey: string;
  };
  connection_config?: unknown;
};

// Helper function to get organization slug - either from config or by fetching from API
const getOrganizationSlug = async (connection: Connection): Promise<string> => {
  try {
    // Try to get from connection config first
    const config = connectionConfigSchema.safeParse(connection.connection_config);
    if (config.success) {
      return config.data.organization.slug;
    }
  } catch {
    // Ignore parsing errors
  }

  // If not in config, fetch from API
  const { apiKey } = connection.credentials;
  const organization = await getOrganization(apiKey);
  return organization.slug;
};

export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
  async ({ connection, organisationId, cursor }) => {
    const organizationSlug = await getOrganizationSlug(connection);
    const accessToken = connection.credentials.apiKey;

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
    const organizationSlug = await getOrganizationSlug(connection);
    const accessToken = connection.credentials.apiKey;

    await deleteUser({
      accessToken,
      userId: id,
      organizationSlug,
    });
  },
});

export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
  async ({ connection, organisationId }) => {
    const organizationSlug = await getOrganizationSlug(connection);
    const accessToken = connection.credentials.apiKey;

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
