import { randomUUID } from 'node:crypto';
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
  try {
    const { organisationId, region } = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region: request.nextUrl.searchParams.get('region'),
    });

    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);
  } catch (error) {
    logger.error('Could not redirect user to Bitbucket app install url', {
      error,
    });

    return new ElbaInstallRedirectResponse({
      region: request.nextUrl.searchParams.get('region'),
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }

  const state = randomUUID();
  cookies().set('oauth_state', state, { httpOnly: true, secure: true });

  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: env.BB_CLIENT_ID,
    client_secret: env.BB_CLIENT_SECRET,
    state,
    redirect_uri: env.BB_CALLBACK_URL,
  });

  const bbOAuthUrl = `${env.BB_AUTH_URL}?${queryParams.toString()}`;

  redirect(bbOAuthUrl);
}
