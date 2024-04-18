import { NextResponse } from 'next/server';
import { refreshObject } from './service';
import { parseWebhookEventData } from '@elba-security/sdk';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  await refreshObject({
    id,
    organisationId,
    metadata,
  });

  return new NextResponse();
}
