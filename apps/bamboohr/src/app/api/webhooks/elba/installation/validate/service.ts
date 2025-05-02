import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { getUsers } from '@/connectors/bamboohr/users';
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
    const { credentials, connection_config: connectionConfig } = await nangoAPIClient.getConnection(
      nangoConnectionId,
      'BASIC'
    );

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    const subDomain = nangoConnectionConfigResult.data.subdomain;
    await getUsers({
      userName: credentials.username,
      password: credentials.password,
      subDomain,
    });

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'bamboohr/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'bamboohr/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: Date.now(),
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
