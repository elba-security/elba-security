import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { handleInstallation, searchParamsSchema } from './service';

export const preferredRegion = 'iad1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const cookiesSchema = z.object({
  organisationId: z.string(),
  region: z.string(),
});

const isStateValid = (request: NextRequest) => {
  const stateParam = request.nextUrl.searchParams.get('state');
  const cookieParam = request.cookies.get('state')?.value;
  if (!stateParam || !cookieParam || stateParam !== cookieParam) {
    return false;
  }
  return true;
};

export const GET = async (request: NextRequest) => {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const region = request.cookies.get('region')?.value;

  try {
    const cookies = cookiesSchema.parse({
      organisationId: request.cookies.get('organisation_id')?.value,
      region,
    });

    const searchParamsResult = searchParamsSchema.safeParse(searchParams);

    if (!searchParamsResult.success) {
      logger.error('Could not validate search params', {
        organisationId: cookies.organisationId,
        region,
        validationError: searchParamsResult.error,
        searchParams,
      });
      return new ElbaInstallRedirectResponse({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL.toString(),
        error: 'unauthorized',
      });
    }

    if (!isStateValid(request)) {
      logger.error('Could not validate oauth state', {
        organisationId: cookies.organisationId,
        region,
        searchParams,
      });
      return new ElbaInstallRedirectResponse({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL.toString(),
        error: 'unauthorized',
      });
    }

    if (!searchParamsResult.data.code) {
      logger.error('Could not retrieve oauth code from search params', {
        organisationId: cookies.organisationId,
        region,
        searchParams,
      });
      return new ElbaInstallRedirectResponse({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL.toString(),
        error: 'unauthorized',
      });
    }

    await handleInstallation({
      organisationId: cookies.organisationId,
      region: cookies.region,
      searchParams: searchParamsResult.data,
    });
  } catch (error) {
    logger.error('Could not install integration', { cause: error });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL.toString(),
      error: 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL.toString(),
  });
};
