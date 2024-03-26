import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';


const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export function GET(request: NextRequest) {
  let organisationId = '';
  let region = '';
  try {
    const parsedSchema = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region: request.nextUrl.searchParams.get('region'),
    });

    organisationId = parsedSchema.organisationId;
    region = parsedSchema.region;

    if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }
    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);

  } catch (error) {
    logger.warn('Could not redirect user to Zendesk app install url', {
      error,
    });
    return new ElbaInstallRedirectResponse({
          error: `internal_error`,
          region,
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
        });
  }

  redirect(`${env.ELBA_REDIRECT_URL}/connection-details?organization_id=${organisationId}&region=${region}`);
}
