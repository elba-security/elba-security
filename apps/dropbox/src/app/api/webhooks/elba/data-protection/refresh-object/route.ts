import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId, metadata, region, nangoConnectionId } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await refreshDataProtectionObject({
    id,
    organisationId,
    metadata,
    region,
    nangoConnectionId,
  });

  return new NextResponse();
}
