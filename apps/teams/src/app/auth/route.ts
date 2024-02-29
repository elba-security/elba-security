import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  admin_consent: z.string().transform((value) => value.toLocaleLowerCase() === 'true'),
  tenant: z.string().min(1),
});
export async function GET(request: NextRequest) {
  try {
    const {
      organisationId,
      region,
      tenant: tenantId,
      admin_consent: hasConsent,
    } = routeInputSchema.parse({
      organisationId: request.cookies.get('organisationId')?.value,
      region: request.cookies.get('region')?.value,
      tenant: request.nextUrl.searchParams.get('tenant'),
      admin_consent: request.nextUrl.searchParams.get('admin_consent'),
    });

    if (!hasConsent) {
      redirect(`${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`);
    }

    await setupOrganisation({ organisationId, region, tenantId });
  } catch (error) {
    logger.warn('Could not setup organisation after Microsoft redirection', {
      error,
    });

    if (isRedirectError(error)) {
      throw error;
    }

    return redirect(
      `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`
    );
  }

  redirect(
    `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    RedirectType.replace
  );
}
