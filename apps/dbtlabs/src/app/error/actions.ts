'use server';
import { getRedirectUrl } from '@elba-security/sdk';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/common/env';

export const redirectTo = (destination: 'elba' | 'install') => {
  const region = cookies().get('region')?.value;
  const organisationId = cookies().get('organisation_id')?.value;

  if (destination === 'elba' || !organisationId || !region) {
    redirect(
      getRedirectUrl({
        region: region || 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      })
    );
  } else {
    redirect(`/install?organisation_id=${organisationId}&region=${region}`);
  }
};
