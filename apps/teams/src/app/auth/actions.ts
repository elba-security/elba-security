'use server';

import { redirect, RedirectType } from 'next/navigation';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/env';
import { setupOrganisation } from './service';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  admin_consent: z.string().transform((value) => value.toLocaleLowerCase() === 'true'),
  tenant: z.string().min(1),
});

type AppInstallData = {
  tenant: string | null;
  admin_consent: string | null;
};

export const checkAppInstallation = async (data: AppInstallData) => {
  unstable_noStore();
  const regionFromCookies = cookies().get('region')?.value;
  try {
    const {
      organisationId,
      region,
      tenant: tenantId,
      admin_consent: hasConsent,
    } = routeInputSchema.parse({
      ...data,
      organisationId: cookies().get('organisationId')?.value,
      region: regionFromCookies,
    });

    if (!hasConsent) {
      redirect(
        getRedirectUrl({
          region,
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
        }),
        RedirectType.replace
      );
    }

    const { isAppInstallationCompleted } = await setupOrganisation({
      organisationId,
      region,
      tenantId,
    });

    if (isAppInstallationCompleted) {
      redirect(
        getRedirectUrl({
          region,
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

    return redirect(
      getRedirectUrl({
        region: regionFromCookies ?? 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }
};
