import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import type { CreateElbaRouteHandler } from './types';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export const createInstallRoute: CreateElbaRouteHandler = (config) => (request: NextRequest) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- ent
  const install = config.routes!.install!;

  const regionParam = request.nextUrl.searchParams.get('region');
  try {
    const { organisationId, region } = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region: regionParam,
    });

    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);

    if (install.withState) {
      const state = crypto.randomUUID();
      cookies().set('state', state);
    }
  } catch (error) {
    logger.warn('Could not redirect user to app install url', {
      error,
    });
    redirect(
      getRedirectUrl({
        sourceId: config.elba.sourceId,
        baseUrl: config.elba.redirectUrl,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
        region: regionParam!,
        error: 'internal_error',
      })
    );
  }
  redirect(install.redirectUrl.toString());
};
