import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();
  const eventData = parseWebhookEventData(
    'data_protection.delete_object_permissions_requested',
    data
  );

  await deleteDataProtectionObjectPermissions(eventData);

  return new NextResponse();
}
