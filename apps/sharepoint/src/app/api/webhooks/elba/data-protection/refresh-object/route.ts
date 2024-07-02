import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshObject } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const webhookData = parseWebhookEventData('data_protection.refresh_object_requested', data);

  await refreshObject(webhookData);

  return new NextResponse();
}
