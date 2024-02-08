import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startDataProtectionSync } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('data_protection.start_sync_requested', data);

  await startDataProtectionSync(organisationId);

  return new NextResponse();
};
