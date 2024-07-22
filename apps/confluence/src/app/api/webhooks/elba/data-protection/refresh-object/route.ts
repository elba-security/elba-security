import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const eventData = parseWebhookEventData('data_protection.refresh_object_requested', data);

  await refreshDataProtectionObject({
    organisationId: eventData.organisationId,
    id: eventData.id,
    metadata: eventData.metadata ,
  });

  return new NextResponse();
}
