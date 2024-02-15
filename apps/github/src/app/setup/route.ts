import type { NextRequest } from 'next/server';
import { RequestError } from '@octokit/request-error';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  installationId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const region = request.cookies.get('region')?.value;
  try {
    const input = routeInputSchema.parse({
      installationId: request.nextUrl.searchParams.get('installation_id'),
      organisationId: request.cookies.get('organisation_id')?.value,
      region,
    });

    await setupOrganisation(input);
  } catch (error) {
    logger.warn('Could not setup organisation after Github redirection', {
      error,
    });
    const isUnauthorized = error instanceof RequestError && error.response?.status === 401;
    return new ElbaInstallRedirectResponse({
      error: isUnauthorized ? 'unauthorized' : 'internal_error',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
}
