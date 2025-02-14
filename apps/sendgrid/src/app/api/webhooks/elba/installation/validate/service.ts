import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { nangoAPIClient } from '@/common/nango';
import { getUsers } from '@/connectors/sendgrid/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
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
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    await getUsers({ apiKey: nangoCredentialsResult.data.apiKey, offset: 1 });

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'sendgrid/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'sendgrid/users.sync.requested',
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
