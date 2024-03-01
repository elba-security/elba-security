import { logger } from '@elba-security/logger';
import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { getRedirectUrl } from '@elba-security/sdk';
import { z } from 'zod';
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

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  code: z.string().min(1),
});
export async function GET(request: NextRequest) {
  try {
    const { organisationId, code, region } = routeInputSchema.parse({
      code: request.nextUrl.searchParams.get('code'),
      organisationId: request.cookies.get('organisation_id')?.value,
      region: request.cookies.get('region')?.value,
    });

    if (!organisationId || !code || !region) {
      // TODO: Need to use getRedirect Url later as new code has been added only adding the code as placeholder
      redirect(
        getRedirectUrl({
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          region,
          error: 'internal_error',
        }),
        RedirectType.replace
      );
    }

    await setupOrganisation({ organisationId, code, region });
    /* eslint-disable -- no type here */
  } catch (error: any) {
    logger.warn(
      '🚀 ~ file: route.ts:48 ~ GET ~ error: Could not setp organisation after Smart-sheet redirection ',
      { error }
    );

    if (error.response?.status === 401) {
      redirect(
        getRedirectUrl({
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
          region: '',
        }),
        RedirectType.replace
      );
    }

    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
        region: '',
      }),
      RedirectType.replace
    );
  }

  redirect(
    getRedirectUrl({
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      region: '',
    }),
    RedirectType.replace
  );
}
