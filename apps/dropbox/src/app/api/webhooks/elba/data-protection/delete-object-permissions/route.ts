import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { deleteDataProtectionObjectPermissions } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata, permissions, nangoConnectionId, region } =
    parseWebhookEventData('data_protection.delete_object_permissions_requested', data);

  if (!nangoConnectionId) {
    logger.error('Missing nango connection ID', { organisationId });
    throw new Error(`Missing nango connection ID for organisation ID ${organisationId}`);
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
