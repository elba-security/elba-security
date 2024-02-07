import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/env';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
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
    logger.warn('Could not redirect user to Microsoft app install url', {
      error,
    });
    redirect(`${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`);
  }
  const url = new URL(env.MICROSOFT_INSTALL_URL);
  url.searchParams.append('client_id', env.MICROSOFT_CLIENT_ID);
  url.searchParams.append('redirect_uri', env.MICROSOFT_REDIRECT_URI);

  redirect(url.toString());
}
