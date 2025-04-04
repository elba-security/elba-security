'use server';

import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env/server';
import { GoogleDriveAccessDenied } from '@/connectors/google/errors';
import { isInstallationCompleted } from './service';

export const isDWDActivationPending = async () => {
  unstable_noStore();
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

  try {
    const isCompleted = await isInstallationCompleted({
      organisationId,
      region,
      googleAdminEmail,
      googleCustomerId,
    });

    if (!isCompleted) {
      return true;
    }
  } catch (error) {
    logger.error('An error occurred during the domain wide delegation', {
      organisationId,
      googleAdminEmail,
      googleCustomerId,
      error,
    });
    return redirect(
      error instanceof GoogleDriveAccessDenied ? '/error?error=gdrive_access_restricted' : '/error'
    );
  }

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    })
  );
};
