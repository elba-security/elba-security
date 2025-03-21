import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { mapElbaConnectionError } from '@/connectors/common/error';
import { getAuthUser } from '@/connectors/okta/users';

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

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    await getAuthUser({
      token: credentials.access_token,
      subDomain: nangoConnectionConfigResult.data.subdomain,
    });

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'okta/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'okta/users.sync.requested',
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
