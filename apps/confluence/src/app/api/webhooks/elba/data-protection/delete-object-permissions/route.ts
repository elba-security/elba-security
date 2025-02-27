import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();
  const { organisationId, id, metadata, permissions, nangoConnectionId, region } =
    parseWebhookEventData('data_protection.delete_object_permissions_requested', data);

  await deleteDataProtectionObjectPermissions({
    organisationId,
    id,
    metadata,
    permissions,
    nangoConnectionId,
    region,
  });

  return new NextResponse();
}
