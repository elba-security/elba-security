import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { startDataProtectionSync } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, nangoConnectionId, region } = parseWebhookEventData(
    'data_protection.start_sync_requested',
    data
  );
  if (!nangoConnectionId) {
    logger.error('Missing nango connection ID', { organisationId });
    throw new Error(`Missing nango connection ID for organisation ID ${organisationId}`);
  }
  await startDataProtectionSync({ organisationId, nangoConnectionId, region });

  return new NextResponse();
}
