import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
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
    redirect(`${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`);
  }
  redirect(env.GITHUB_APP_INSTALL_URL);
}
