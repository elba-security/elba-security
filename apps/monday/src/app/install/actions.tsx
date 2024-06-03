'use server';

import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { env } from '@/common/env/server';

export const connectMondayApp = ({
  organisationId,
  region,
}: {
  organisationId: string | undefined;
  region: string | undefined;
}) => {
  if (!organisationId || !region) {
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

  const state = crypto.randomUUID();

  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(`${env.MONDAY_APP_INSTALL_URL}/authorize`);
  redirectUrl.searchParams.append('client_id', env.NEXT_PUBLIC_MONDAY_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.MONDAY_REDIRECT_URI);
  redirectUrl.searchParams.append('state', state);

  redirect(redirectUrl.toString());
};
