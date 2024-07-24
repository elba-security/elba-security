import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = 'fra1';
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
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

  // we store the organisationId in the cookies to be able to retrieve after the SaaS redirection
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  // we redirect the user to the installation page of the SaaS application
  redirect(
    // this is an example URL that should be replaced by an env variable
    'https://my-saas.com/install/elba'
  );
}
