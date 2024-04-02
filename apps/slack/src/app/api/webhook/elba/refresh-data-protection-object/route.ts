import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  await refreshDataProtectionObject({ organisationId, metadata });

  return new NextResponse();
};
