import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { checkOrganization } from './service';
// import { setupOrganisation } from './service';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  const organisationId = request.cookies.get('organisation_id')?.value;
  if (!organisationId) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }
  const token = await checkOrganization(organisationId);

  if (token) {
    redirect('http://localhost:4000/auth', RedirectType.replace);
  }
  redirect(
    `https://trello.com/1/authorize?expiration=1day&name=testApp&scope=read&response_type=token&key=${env.TRELLO_API_KEY}&redirect_uri=http://localhost:4000/integration`,
    RedirectType.replace
  );
}
