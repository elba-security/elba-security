import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ElbaRoute } from '../types';
import { env } from '../../common/env';

export const install: ElbaRoute = (request, { config }) => {
  if (!config.oauth) {
    return new Response(null, { status: 404 });
  }

  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      error: 'internal_error',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    });
  }

  const state = crypto.randomUUID();

  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(config.oauth.installationUrl);
  redirectUrl.searchParams.append('state', state);

  redirect(redirectUrl.toString());
};
