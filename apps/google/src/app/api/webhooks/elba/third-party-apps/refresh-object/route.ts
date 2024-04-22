import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshThirdPartyAppsObject } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, userId, appId } = parseWebhookEventData(
    'third_party_apps.refresh_object_requested',
    data
  );

  await refreshThirdPartyAppsObject({
    organisationId,
    userId,
    appId,
  });

  return new NextResponse();
}
