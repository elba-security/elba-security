import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  adminConsent: z.string().transform((value) => value.toLocaleLowerCase() === 'true'),
  tenantId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const region = request.cookies.get('region')?.value;
  try {
    const input = routeInputSchema.parse({
      organisationId: request.cookies.get('organisation_id')?.value,
      region: request.cookies.get('region')?.value,
      tenantId: request.nextUrl.searchParams.get('tenant'),
      adminConsent: request.nextUrl.searchParams.get('admin_consent'),
    });

    if (!input.adminConsent) {
      logger.warn('Could not setup organisation after Microsoft redirection', {
        error: 'admin_consent was not given',
      });
      return new ElbaInstallRedirectResponse({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region,
        error: 'unauthorized',
      });
    }

    await setupOrganisation(input);
  } catch (error) {
    logger.warn('Could not setup organisation after Microsoft redirection', {
      error,
    });
    return new ElbaInstallRedirectResponse({
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      region,
      error: 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
    region,
  });
}
