import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const eventData = parseWebhookEventData('data_protection.refresh_object_requested', data);
  const nangoConnectionId = eventData.organisationId;

  if (!nangoConnectionId) {
    logger.error('Missing nango connection ID', { nangoConnectionId });
    throw new Error(`Missing nango connection ID for organisation ID ${nangoConnectionId}`);
  }
  await refreshDataProtectionObject({
    organisationId: eventData.organisationId,
    id: eventData.id,
    metadata: eventData.metadata,
    nangoConnectionId,
    region: eventData.region,
  });

  return new NextResponse();
}
