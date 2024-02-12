import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export function GET(request: NextRequest) {
  try {
    const { organisationId, region } = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region: request.nextUrl.searchParams.get('region'),
    });

    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);
  } catch (error) {
    logger.warn('Could not redirect user to Github app install url', {
      error,
    });
    redirect(
      getRedirectUrl({
        region: request.nextUrl.searchParams.get('region') ?? 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      })
    );
  }
  redirect(env.GITHUB_APP_INSTALL_URL);
}
