import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startDataProtectionSync } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId, nangoConnectionId, region } = parseWebhookEventData(
    'data_protection.start_sync_requested',
    data
  );

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await startDataProtectionSync({
    organisationId,
    nangoConnectionId,
    region,
  });

  return new NextResponse();
}
