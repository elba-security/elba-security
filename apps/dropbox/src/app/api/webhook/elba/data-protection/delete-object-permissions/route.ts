import { parseWebhookEventData } from '@elba-security/sdk';
import { NextResponse } from 'next/server';
import { deleteObjectPermissions } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata, permissions } = parseWebhookEventData(
    'data_protection.delete_object_permissions_requested',
    data
  );

  await deleteObjectPermissions({
    id,
    organisationId,
    metadata,
    permissions,
  });

  return new NextResponse();
}
