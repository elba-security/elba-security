import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { getAuthenticatedAdmin } from '@/connectors/dropbox/users';
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
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }
    
    await getAuthenticatedAdmin(credentials.access_token);

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'dropbox/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'dropbox/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: Date.now(),
          cursor: null,
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
