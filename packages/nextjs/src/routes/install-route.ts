import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '../install-redirect-response';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type CreateInstallRouteOptions = {
  redirectUrl: string | URL;
  elbaRedirectUrl: string | URL;
  elbaSourceId: string;
  withState?: boolean;
};

export const createInstallRoute =
  ({ redirectUrl, elbaRedirectUrl, elbaSourceId, withState = false }: CreateInstallRouteOptions) =>
  (request: NextRequest) => {
    try {
      const { organisationId, region } = routeInputSchema.parse({
        organisationId: request.nextUrl.searchParams.get('organisation_id'),
        region: request.nextUrl.searchParams.get('region'),
      });
      const locationHeaderUrl = new URL(redirectUrl);

      if (withState) {
        const state = crypto.randomUUID();
        cookies().set('state', state);
        locationHeaderUrl.searchParams.append('state', state);
      }
      cookies().set('organisation_id', organisationId);
      cookies().set('region', region);

      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: locationHeaderUrl.toString(),
        },
      });
    } catch (error) {
      logger.warn('Could not redirect user to install url', {
        error,
      });
      return new ElbaInstallRedirectResponse({
        baseUrl: elbaRedirectUrl.toString(),
        sourceId: elbaSourceId.toString(),
        region: request.nextUrl.searchParams.get('region'),
        error: 'internal_error',
      });
    }
  };
