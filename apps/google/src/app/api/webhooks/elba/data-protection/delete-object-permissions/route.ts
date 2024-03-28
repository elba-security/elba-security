import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const {
    organisationId,
    id: objectId,
    metadata, // eslint-disable-line -- metadata type is any
    permissions,
  } = parseWebhookEventData('data_protection.delete_object_permissions_requested', data);

  await deleteDataProtectionObjectPermissions({
    organisationId,
    objectId,
    metadata, // eslint-disable-line -- metadata type is any
    permissionIds: permissions.map(({ id }) => id),
  });

  return new NextResponse();
}
