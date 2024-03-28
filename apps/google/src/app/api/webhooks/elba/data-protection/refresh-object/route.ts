import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const {
    organisationId,
    id: objectId,
    metadata, // eslint-disable-line -- metadata type is any
  } = parseWebhookEventData('data_protection.refresh_object_requested', data);

  await refreshDataProtectionObject({
    organisationId,
    objectId,
    metadata, // eslint-disable-line -- metadata type is any
  });

  return new NextResponse();
}
