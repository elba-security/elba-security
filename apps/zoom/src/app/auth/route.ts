import { RedirectType, redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupOrganisation } from './service';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
// import { getRedirectUrl } from '@elba-security/sdk';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  code: z.string().min(1),
});
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const organisationId = request.cookies.get('organisation_id')?.value;
    const region = request.cookies.get('region')?.value;

    if (!organisationId || !code || !region) {
      // TODO: Need to use getRedirect Url later as new code has been added only adding the code as placeholder
      // redirect(
      //   getRedirectUrl({
      //     sourceId: env.ELBA_SOURCE_ID,
      //     baseUrl: env.ELBA_REDIRECT_URL,
      //     error: 'internal_error',
      //   }),
      //   RedirectType.replace
      // );

      redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
    }

    await setupOrganisation({ organisationId, code, region });
  } catch (error: any) {
    logger.warn(
      '🚀 ~ file: route.ts:48 ~ GET ~ error: Could not setp organisation after Zoom redirection ',
      { error }
    );

    if (error.response?.status == 401) {
      redirect(`${env.ELBA_REDIRECT_URL}?error=unauthorized`, RedirectType.replace);

      // TODO: Used this commented code later
      //  redirect(
      //    getRedirectUrl({
      //      sourceId: env.ELBA_SOURCE_ID,
      //      baseUrl: env.ELBA_REDIRECT_URL,
      //      error: 'unauthorized',
      //    }),
      //    RedirectType.replace
      //  );
    }

    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
    // TODO: Used this commented code later
    //  redirect(
    //    getRedirectUrl({
    //      sourceId: env.ELBA_SOURCE_ID,
    //      baseUrl: env.ELBA_REDIRECT_URL,
    //      error: 'internal_error',
    //    }),
    //    RedirectType.replace
    //  );
  }

  redirect(`${env.ELBA_REDIRECT_URL}`, RedirectType.replace);

  // TODO: Used this commented code later
  // redirect(
  //   getRedirectUrl({
  //     sourceId: env.ELBA_SOURCE_ID,
  //     baseUrl: env.ELBA_REDIRECT_URL,
  //   }),
  //   RedirectType.replace
  // );
}
