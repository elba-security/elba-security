import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
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

  try {
    const cookiesResult = cookiesSchema.safeParse({
      state: request.cookies.get('state')?.value,
      organisationId: request.cookies.get('organisationId')?.value,
      region: request.cookies.get('region')?.value,
    });
    if (!cookiesResult.success) {
      throw new Error('Missing cookies');
    }

    const { state, organisationId, region } = cookiesResult.data;
    const searchParamsResult = routeErrorInputSchema.safeParse(searchParams);

    if (
      !searchParamsResult.success ||
      ('state' in searchParamsResult && searchParamsResult.state !== state)
    ) {
      throw new Error('Failed to parse oauth data and verify state');
    }

    if ('error' in searchParamsResult.data) {
      logger.error('Got an error from Slack', {
        organisationId,
        region,
        error: searchParamsResult.data.error,
        errorDescription: searchParamsResult.data.error_description,
      });
      redirect(
        `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
        RedirectType.replace
      );
    }

    await handleSlackInstallation({ organisationId, region, code: searchParamsResult.data.code });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logger.error('An error occurred during Slack oauth flow', { cause: error });
    redirect(
      `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      RedirectType.replace
    );
  }

  redirect(
    `${env.ELBA_REDIRECT_URL}?success=true&source_id=${env.ELBA_SOURCE_ID}`,
    RedirectType.replace
  );
};
