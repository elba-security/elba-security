import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { getAuthUser } from '@/connectors/freshdesk/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';
import { mapElbaConnectionError } from '@/connectors/common/error';

export const validateSourceInstallation = async ({
  organisationId,
  region,
  nangoConnectionId,
}: {
  organisationId: string;
  region: string;
  nangoConnectionId: string;
}) => {
  const elba = createElbaOrganisationClient({
    organisationId,
    region,
  });
  try {
    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);

    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    const subDomain = nangoConnectionConfigResult.data.subdomain;

    await getAuthUser({
      userName: nangoCredentialsResult.data.username,
      password: nangoCredentialsResult.data.password,
      subDomain,
    });
    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'freshdesk/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'freshdesk/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: Date.now(),
          page: null,
        },
      },
    ]);

    return { message: 'Source installation validated' };
  } catch (error) {
    logger.error('Failed to validate installation', {
      organisationId,
      region,
      nangoConnectionId,
      error,
    });

    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
