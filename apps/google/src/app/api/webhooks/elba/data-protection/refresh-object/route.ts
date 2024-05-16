import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const {
    organisationId,
    id: objectId,
    metadata,
  } = parseWebhookEventData('data_protection.refresh_object_requested', data);

  await refreshDataProtectionObject({ organisationId, objectId, metadata });

  return new NextResponse();
}
