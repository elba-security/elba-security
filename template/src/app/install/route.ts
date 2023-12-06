import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/env';

// Remove theses 3 lines if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');

  if (!organisationId) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  // we store the organisationId in the cookies to be able to retrieve after the SaaS redirection
  cookies().set('organisation_id', organisationId);

  // we redirect the user to the installation page of the SaaS application
  redirect(
    // this is an example URL that should be replaced by an env variable
    'https://my-saas.com/install/elba'
  );
}
