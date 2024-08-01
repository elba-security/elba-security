'use server';

import { logger } from '@elba-security/logger';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/env';
import { setupOrganisation } from './service';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  adminConsent: z.string().transform((value) => value.toLocaleLowerCase() === 'true'),
  tenantId: z.string().min(1),
});

type CheckAppInstallationParams = {
  tenant: string | null;
  adminConsent: string | null;
};

export const checkAppInstallation = async ({
  tenant,
  adminConsent,
}: CheckAppInstallationParams) => {
  unstable_noStore();
  const organisationId = cookies().get('organisation_id')?.value;
  const region = cookies().get('region')?.value;
  try {
    const input = routeInputSchema.parse({
      organisationId,
      region,
      tenantId: tenant,
      adminConsent,
    });

    if (!input.adminConsent) {
      logger.warn('Could not setup organisation after Microsoft redirection', {
        error: 'admin_consent was not given',
      });
      redirect(
        getRedirectUrl({
          region: region ?? 'eu',
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
        }),
        RedirectType.replace
      );
    }

    const { isAppInstallationCompleted } = await setupOrganisation(input);
    if (isAppInstallationCompleted) {
      redirect(
        getRedirectUrl({
          region: region ?? 'eu',
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
        }),
        RedirectType.replace
      );
    }

    return true;
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    logger.warn('Could not setup organisation after Microsoft redirection', {
      error,
    });
    redirect(
      getRedirectUrl({
        region: region ?? 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }
};
