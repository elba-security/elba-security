import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, userId, appId, nangoConnectionId, region } = parseWebhookEventData(
    'third_party_apps.refresh_object_requested',
    data
  );

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await refreshThirdPartyAppsObject({
    organisationId,
    userId,
    appId,
    nangoConnectionId,
    region,
  });

  return new NextResponse();
}
