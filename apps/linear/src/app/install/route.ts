import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/env';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const state = crypto.randomUUID();
  // we store the organisationId in the cookies to be able to retrieve after the SaaS redirection
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);
  cookies().set('state', state);

  const redirectUrl = new URL(`${env.LINEAR_APP_INSTALL_URL}authorize?`);
  redirectUrl.searchParams.append('client_id', env.LINEAR_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.LINEAR_REDIRECT_URI);
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('state', state);
  redirectUrl.searchParams.append('scope', "read"); // Scopes are space-separated.
  redirectUrl.searchParams.append('code_challenge_method', "S256");

  // we redirect the user to the installation page of the SaaS application
  redirect(redirectUrl.toString());
}
