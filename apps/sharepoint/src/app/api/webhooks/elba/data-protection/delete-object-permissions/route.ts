import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteObjectPermissions } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const webhookData = parseWebhookEventData(
    'data_protection.delete_object_permissions_requested',
    data
  );

  await deleteObjectPermissions(webhookData);

  return new NextResponse();
}
