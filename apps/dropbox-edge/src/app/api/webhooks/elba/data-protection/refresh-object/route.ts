import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  await refreshDataProtectionObject({
    id,
    organisationId,
    metadata,
  });

  return new NextResponse();
}
