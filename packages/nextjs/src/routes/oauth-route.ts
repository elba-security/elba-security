import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { ElbaInstallRedirectResponse } from '../install-redirect-response';

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

export type InstallationHandler<S extends z.AnyZodObject> = (params: {
  region: string;
  organisationId: string;
  searchParams: z.infer<S>;
}) => Promise<void>;

type CreateOAuthRouteOptions<S extends z.AnyZodObject> = {
  searchParamsSchema: S;
  withState?: boolean;
  elbaRedirectUrl: string | URL;
  elbaSourceId: string;
  handleInstallation: InstallationHandler<S>;
};

export const createOAuthRoute =
  <S extends z.AnyZodObject = z.AnyZodObject>({
    searchParamsSchema,
    withState = false,
    handleInstallation,
    elbaRedirectUrl,
    elbaSourceId,
  }: CreateOAuthRouteOptions<S>) =>
  async (request: NextRequest) => {
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
          sourceId: elbaSourceId,
          baseUrl: elbaRedirectUrl.toString(),
          error: 'unauthorized',
        });
      }

      if (withState && !isStateValid(request)) {
        logger.error('Could not validate oauth state', {
          organisationId: cookies.organisationId,
          region,
          searchParams,
        });
        return new ElbaInstallRedirectResponse({
          region,
          sourceId: elbaSourceId,
          baseUrl: elbaRedirectUrl.toString(),
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
        sourceId: elbaSourceId,
        baseUrl: elbaRedirectUrl.toString(),
        error: 'internal_error',
      });
    }

    return new ElbaInstallRedirectResponse({
      region,
      sourceId: elbaSourceId,
      baseUrl: elbaRedirectUrl.toString(),
    });
  };
