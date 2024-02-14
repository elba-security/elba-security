import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get('region');
  try {
    const input = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region,
    });

    cookies().set('organisation_id', input.organisationId);
    cookies().set('region', input.region);
  } catch (error) {
    logger.warn('Could not redirect user to Github app install url', {
      error,
    });
    return new ElbaInstallRedirectResponse({
      error: 'internal_error',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    });
  }
  redirect(env.GITHUB_APP_INSTALL_URL);
}
