import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshThirdPartyAppsObject } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId, userId, appId } = parseWebhookEventData(
    'third_party_apps.refresh_object_requested',
    data
  );

  const response = await refreshThirdPartyAppsObject({
    organisationId,
    userId,
    appId
  });

  return NextResponse.json(response);
};