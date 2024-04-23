import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  if (!organisationId || !code || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  await setupOrganisation({ organisationId, code, region });

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}
