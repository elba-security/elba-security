import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { JiraError } from '@/connectors/jira/commons/error';
import { setupOrganisation } from './service';

const oauthInputSchema = z.object({
  accessCode: z.string().min(1),
  state: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { accessCode, state } = oauthInputSchema.parse({
      accessCode: request.nextUrl.searchParams.get('code'),
      state: request.nextUrl.searchParams.get('state'),
    });

    if (request.cookies.get('oauth_state')?.value !== state) {
      throw new Error('Invalid state parameter');
    }

    const organisationId = request.cookies.get('organisation_id')?.value;
    const region = request.cookies.get('region')?.value;

    if (!organisationId || !region) {
      throw new Error('Missing organisation ID or region');
    }

    await setupOrganisation({ organisationId, region, accessCode });
  } catch (error) {
    logger.warn('Could not setup organisation after Jira redirection', { error });
    if (isRedirectError(error)) {
      throw error;
    }

    return new ElbaInstallRedirectResponse({
      region: request.cookies.get('region')?.value,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error:
        error instanceof JiraError && error.response?.status === 401
          ? 'unauthorized'
          : 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    region: request.cookies.get('region')?.value,
    baseUrl: env.ELBA_REDIRECT_URL,
    sourceId: env.ELBA_SOURCE_ID,
  });
}
