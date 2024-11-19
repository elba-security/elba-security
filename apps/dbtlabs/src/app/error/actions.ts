'use server';
import { getRedirectUrl } from '@elba-security/sdk';
import { cookies } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';

export const redirectTo = () => {
  const region = cookies().get('region')?.value;
  const organisationId = cookies().get('organisation_id')?.value;

  if (!organisationId || !region) {
    logger.error('Redirect URL is not found');
    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: region ?? 'eu',
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }

  redirect(`/install?organisation_id=${organisationId}&region=${region}`);
};
