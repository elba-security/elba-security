'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { cookies } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { env } from '@/common/env';

export const install = ({
  organisationId,
  region,
}: {
  organisationId: string | null;
  region: string | null;
}) => {
  const cookieStore = cookies();
  if (!organisationId || !region) {
    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: region || 'eu',
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }

  cookieStore.set('organisation_id', organisationId);
  cookieStore.set('region', region);

  redirect(env.SENTRY_APP_INSTALL_URL);
};
