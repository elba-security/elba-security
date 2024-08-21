import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata, permissions } = parseWebhookEventData(
    'data_protection.delete_object_permissions_requested',
    data
  );

  await deleteDataProtectionObjectPermissions({ id, organisationId, metadata, permissions });

  return new NextResponse();
}
