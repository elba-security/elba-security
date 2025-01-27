import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, userId, appId, nangoConnectionId, region } = parseWebhookEventData(
    'third_party_apps.delete_object_requested',
    data
  );

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await deleteThirdPartyAppsObject({
    organisationId,
    userId,
    appId,
    nangoConnectionId,
    region,
  });

  return new NextResponse();
}
