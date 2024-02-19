import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import type { SendEventPayload } from 'inngest/helpers/types';
import { ElbaInstallRedirectResponse } from '../common';
import { env } from '../../common';
import type { AnyElbaInngest, InjectEventsNamespace } from '../../inngest/client/inngest';
import type { ElbaEventsRecord } from '../../inngest/client/events';

const cookiesSchema = z.object({
  organisationId: z.string(),
  region: z.string(),
});

const isStateValidate = (request: NextRequest) => {
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
}) => Promise<{ tokenExpiresAt: Date | null }>;

type CreateOAuthRouteOptions<S extends z.AnyZodObject> = {
  inngest: AnyElbaInngest;
  searchParamsSchema: S;
  withState?: boolean;
  handleInstallation: InstallationHandler<S>;
};

export const createOAuthRoute =
  <S extends z.AnyZodObject = z.AnyZodObject>({
    inngest,
    searchParamsSchema,
    withState = false,
    handleInstallation,
  }: CreateOAuthRouteOptions<S>) =>
  async (request: NextRequest) => {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const region = request.cookies.get('region')?.value;

    try {
      const cookies = cookiesSchema.parse({
        organisationId: request.cookies.get('organisationId')?.value,
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
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
        });
      }

      if (withState && isStateValidate(request)) {
        logger.error('Could not validate oauth state', {
          organisationId: cookies.organisationId,
          region,
          searchParams,
        });
        return new ElbaInstallRedirectResponse({
          region,
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
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
          baseUrl: env.ELBA_REDIRECT_URL,
          error: 'unauthorized',
        });
      }

      const { tokenExpiresAt } = await handleInstallation({
        organisationId: cookies.organisationId,
        region: cookies.region,
        searchParams: searchParamsResult.data,
      });

      const events: SendEventPayload<InjectEventsNamespace<ElbaEventsRecord, string>> = [
        {
          name: `${inngest.id}/app.installed`,
          data: {
            organisationId: cookies.organisationId,
          },
        },
        {
          name: `${inngest.id}/users.sync.requested`,
          data: {
            organisationId: cookies.organisationId,
            isFirstSync: true,
            syncStartedAt: Date.now(),
            cursor: null,
          },
        },
      ];

      // some integration does not have token or it does not expires
      if (tokenExpiresAt) {
        events.push({
          name: `${inngest.id}/token.refresh.requested`,
          data: {
            organisationId: cookies.organisationId,
            expiresAt: tokenExpiresAt.getTime(),
          },
        });
      }

      await inngest.send(events);
    } catch (error) {
      logger.error('Could not install integration', { cause: error });
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
