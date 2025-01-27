import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata, permissions, nangoConnectionId, region } =
    parseWebhookEventData('data_protection.delete_object_permissions_requested', data);

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await deleteDataProtectionObjectPermissions({
    id,
    organisationId,
    metadata,
    permissions,
    nangoConnectionId,
    region,
  });

  return new NextResponse();
}
