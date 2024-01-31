import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const organisationId = request.cookies.get('organisation_id')?.value;
    const region = request.cookies.get('region')?.value;

    if (!organisationId || !code || !region) {
      redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
    }

    await setupOrganisation({ organisationId, code, region });
  }
  catch (error) {
    redirect(
      `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      RedirectType.replace
    );
  }

  redirect(
    `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    RedirectType.replace
  );

}
