import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupOrganisation } from './service';

// Remove theses 3 lines if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;

  if (!organisationId || !code) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  await setupOrganisation(organisationId, code);

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}
