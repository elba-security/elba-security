import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startDataProtectionSync } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('data_protection.start_sync_requested', data);

  await startDataProtectionSync(organisationId);

  return new NextResponse();
}
