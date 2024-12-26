import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { mapElbaConnectionError } from '@/connectors/common/error';
import { getAuthUser } from '@/connectors/datadog/users';

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

    await getAuthUser({
      apiKey: nangoCredentialsResult.data.apiKey,
      appKey: nangoConnectionConfigResult.data.applicationKey,
      sourceRegion: nangoConnectionConfigResult.data.siteParameter,
    });

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'datadog/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'datadog/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: Date.now(),
          page: 0,
        },
      },
    ]);

    return { message: 'Source installation validated' };
  } catch (error) {
    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
