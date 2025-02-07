import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { mapElbaConnectionError } from '@/connectors/common/error';
import { getTokenOwnerInfo } from '@/connectors/openai/users';

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

    await elba.connectionStatus.update({
      errorType: null,
    });

    const apiKey = nangoCredentialsResult.data.apiKey;
    const { userId, organization } = await getTokenOwnerInfo(apiKey);

    // This check is not the cleanest. Sadly the endpoint doesn't return `is_service_account`
    // user are always prefixed with `user-` but service accounts aren't
    // If an admin creates a service account with a name starting with `user-` this will fail
    // We should probably rely on email attribute as it's null for service accounts
    if (userId.startsWith('user-')) {
      throw new Error("The given API key doesn't belong to a service account");
    }
    if (organization?.personal) {
      throw new Error("Personal organizations aren't supported");
    }
    if (!organization?.id) {
      throw new Error("The given API key doesn't belong to an organization");
    }
    if (organization.role !== 'owner') {
      throw new Error("The service account role isn't 'owner");
    }

    await inngest.send([
      {
        name: 'openai/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'openai/users.sync.requested',
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
    logger.error('Source installation validation failed', {
      error,
      organisationId,
      region,
      nangoConnectionId,
    });

    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
