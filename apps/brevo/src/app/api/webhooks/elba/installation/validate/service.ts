import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { getUsers } from '@/connectors/brevo/users';
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
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');

    await getUsers(credentials.apiKey);

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'brevo/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'brevo/users.sync.requested',
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
    logger.error('Source installation validation failed', {
      error,
      organisationId,
      nangoConnectionId,
      region,
    });
    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
