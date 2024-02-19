import { NextResponse } from 'next/server';
import { refreshThirdPartyAppsObject } from './service';
import { parseWebhookEventData } from '@elba-security/sdk';

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
