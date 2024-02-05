import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupOrganisation } from './service';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const organisationId = request.nextUrl.searchParams.get('state');
    const errorMessage = request.nextUrl.searchParams.get('error');

    if (errorMessage) {
      throw new Error(`Could not authenticate organisation with id=${organisationId}`, {
        cause: errorMessage,
      });
    }

    if (!code) {
      throw new Error('Could not authenticate organisation', { cause: 'code is missing' });
    }

    if (!organisationId) {
      throw new Error(`Could not authentication organisation`, {
        cause: 'organisationId is missing',
      });
    }

    await setupOrganisation(organisationId, code);
  } catch (error) {
    // TODO: log the error when logger is implemented
    // note that redirect throw an error
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}
