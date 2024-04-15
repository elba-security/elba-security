import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

type CreateInstallRouteParams = {
  sourceId: string;
  baseUrl: string;
  url: string | URL;
};

export const createInstallRoute =
  ({ url, sourceId, baseUrl }: CreateInstallRouteParams) =>
  (request: NextRequest) => {
    const regionParam = request.nextUrl.searchParams.get('region');
    try {
      const { organisationId, region } = routeInputSchema.parse({
        organisationId: request.nextUrl.searchParams.get('organisation_id'),
        region: regionParam,
      });

      cookies().set('organisation_id', organisationId);
      cookies().set('region', region);
    } catch (error) {
      logger.warn('Could not redirect user to Microsoft app install url', {
        error,
      });
      redirect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
        getRedirectUrl({ sourceId, baseUrl, region: regionParam!, error: 'internal_error' })
      );
    }
    redirect(url.toString());
  };
