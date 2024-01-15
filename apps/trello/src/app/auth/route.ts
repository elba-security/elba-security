import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { setupOrganisation } from './service';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * This route path can be changed to fit your implementation specificities.
 */
export async function GET(request: NextRequest) {
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;
  const token = request.cookies.get('auth_token')?.value || '';

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }
  await setupOrganisation({ organisationId, token, region });
  await inngest.send({
    name: 'trello/users/sync_page.triggered',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: null,
    },
  });

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}
