import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { RequestError } from '@octokit/request-error';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  installationId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const input = routeInputSchema.parse({
      installationId: request.nextUrl.searchParams.get('installation_id'),
      organisationId: request.cookies.get('organisation_id')?.value,
      region: request.cookies.get('region')?.value,
    });

    await setupOrganisation(input);
  } catch (error) {
    logger.warn('Could not setup organisation after Github redirection', {
      error,
    });
    if (error instanceof RequestError && error.response?.status === 401) {
      redirect(
        getRedirectUrl({
          region: request.cookies.get('region')?.value ?? 'eu',
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
        }),
        RedirectType.replace
      );
    }
    redirect(
      getRedirectUrl({
        region: request.cookies.get('region')?.value ?? 'eu',
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }

  redirect(
    getRedirectUrl({
      region: request.cookies.get('region')?.value ?? 'eu',
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    }),
    RedirectType.replace
  );
}
