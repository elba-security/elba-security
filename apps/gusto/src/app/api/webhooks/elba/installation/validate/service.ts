import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { nangoAPIClient } from '@/common/nango';
import { getTokenInfo } from '@/connectors/gusto/users';
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

    await getTokenInfo(credentials.access_token);
    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'gusto/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'gusto/users.sync.requested',
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
