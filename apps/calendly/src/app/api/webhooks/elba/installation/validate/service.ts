import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { logger } from '@elba-security/logger';
import { nangoAPIClient } from '@/common/nango';
import { checkOrganisationPlan } from '@/connectors/calendly/organisation';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';
import { CalendlyNotAdminError, mapElbaConnectionError } from '@/connectors/common/error';
import { nangoRawCredentialsSchema } from '@/connectors/common/nango';
import { getUsers } from '@/connectors/calendly/users';

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

    const rawCredentials = nangoRawCredentialsSchema.parse(credentials.raw);

    const {
      validUsers: [currentUser],
    } = await getUsers({
      accessToken: credentials.access_token,
      organizationUri: rawCredentials.organization,
      userUri: rawCredentials.owner,
    });

    if (!currentUser || !['admin', 'owner'].includes(currentUser.role)) {
      logger.error('User is not admin', { organisationId, region, nangoConnectionId, currentUser });
      throw new CalendlyNotAdminError('User is not admin');
    }

    await checkOrganisationPlan({
      accessToken: credentials.access_token,
      organizationUri: rawCredentials.organization,
    });

    await elba.connectionStatus.update({
      errorType: null,
    });

    await inngest.send([
      {
        name: 'calendly/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'calendly/users.sync.requested',
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
