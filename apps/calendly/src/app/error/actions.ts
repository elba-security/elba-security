'use server';
import { getRedirectUrl } from '@elba-security/sdk';
import { cookies } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { env } from '@/common/env';

export const redirectTo = (destination: 'elba' | 'install') => {
  const region = cookies().get('region')?.value;
  const redirectUrl = cookies().get('redirect_url')?.value;

  if (destination === 'elba' || !region || !redirectUrl) {
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

  redirect(redirectUrl, RedirectType.replace);
};
