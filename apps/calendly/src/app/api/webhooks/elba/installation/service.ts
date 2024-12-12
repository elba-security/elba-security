import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { nangoAPIClient } from '@/common/nango';
import { getOrganisation } from '@/connectors/calendly/organisation';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { inngest } from '@/inngest/client';
import { mapElbaConnectionError } from '@/connectors/common/error';
import { env } from '@/common/env';

const isDevelopment =
  (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') && process.env.NODE_ENV !== 'test';

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
    if (!isDevelopment) {
      const { plan, stage } = await getOrganisation({
        accessToken: credentials.access_token,
        organizationUri: credentials.raw.organization as string,
      });
      if (['basic', 'essentials'].includes(plan) || stage !== 'paid') {
        throw new Error('Invalid account plan');
      }
    }

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
    const errorType = mapElbaConnectionError(error);
    await elba.connectionStatus.update({
      errorType: errorType || 'unknown',
      errorMetadata: serializeLogObject(error),
    });

    return { message: 'Source installation validation failed' };
  }
};
