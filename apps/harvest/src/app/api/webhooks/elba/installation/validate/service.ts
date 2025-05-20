import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { nangoAPIClient } from '@/common/nango';
import { getAuthUser } from '@/connectors/harvest/users';
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
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

    await getAuthUser(credentials.access_token);
    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'harvest/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'harvest/users.sync.requested',
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
    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
