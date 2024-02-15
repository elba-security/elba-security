import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env';
import { handleSlackInstallation } from './service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeErrorInputSchema = z.union([
  z.object({
    error: z.string(),
    error_description: z.string(),
  }),
  z.object({
    state: z.string(),
    code: z.string(),
  }),
]);

const cookiesSchema = z.object({
  state: z.string(),
  organisationId: z.string(),
  region: z.string(),
});

export const GET = async (request: NextRequest) => {
  const searchParams = [...request.nextUrl.searchParams.entries()].reduce<Record<string, string>>(
    (acc, [key, value]) => ({ ...acc, [key]: value }),
    {}
  );

  const region = request.cookies.get('region')?.value;

  try {
    const cookies = cookiesSchema.parse({
      state: request.cookies.get('state')?.value,
      organisationId: request.cookies.get('organisationId')?.value,
      region,
    });

    const searchParamsResult = routeErrorInputSchema.safeParse(searchParams);

    if (
      !searchParamsResult.success ||
      ('state' in searchParamsResult && searchParamsResult.state !== cookies.state)
    ) {
      throw new Error('Failed to parse oauth data and verify state');
    }

    if ('error' in searchParamsResult.data) {
      logger.error('Got an error from Slack', {
        organisationId: cookies.organisationId,
        region,
        error: searchParamsResult.data.error,
        errorDescription: searchParamsResult.data.error_description,
      });
      return new ElbaInstallRedirectResponse({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'unauthorized',
      });
    }

    await handleSlackInstallation({
      organisationId: cookies.organisationId,
      region: cookies.region,
      code: searchParamsResult.data.code,
    });
  } catch (error) {
    logger.error('An error occurred during Slack oauth flow', { cause: error });

    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
};
