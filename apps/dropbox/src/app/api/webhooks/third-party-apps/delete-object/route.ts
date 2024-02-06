import { NextResponse } from 'next/server';
import { deleteThirdPartyAppsObject } from './service';
import { parseWebhookEventData } from '@elba-security/sdk';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, userId, appId } = parseWebhookEventData(
    'third_party_apps.delete_requested',
    data
  );

  const response = await deleteThirdPartyAppsObject({
    organisationId,
    userId,
    appId,
  });

  return NextResponse.json(response);
}
