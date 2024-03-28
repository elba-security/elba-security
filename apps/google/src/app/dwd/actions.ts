'use server';

import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { isInstallationCompleted } from './service';

export const isDWDActivationPending = async () => {
  const organisationId = cookies().get('organisation_id')?.value;
  const region = cookies().get('region')?.value;
  const googleAdminEmail = cookies().get('google_admin_email')?.value;
  const googleCustomerId = cookies().get('google_customer_id')?.value;

  if (!organisationId || !region || !googleAdminEmail || !googleCustomerId) {
    logger.error('Missing cookies during Google domain wide delegation');

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

  const isCompleted = await isInstallationCompleted({
    organisationId,
    region,
    googleAdminEmail,
    googleCustomerId,
  });

  if (!isCompleted) {
    return true;
  }

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    })
  );
};
