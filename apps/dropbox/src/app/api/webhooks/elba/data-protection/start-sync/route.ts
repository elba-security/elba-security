import { NextResponse } from 'next/server';
import { startSync } from './service';
import { parseWebhookEventData } from '@elba-security/sdk';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId } = await parseWebhookEventData(
    'data_protection.start_sync_requested',
    data
  );

  await startSync(organisationId);

  return new NextResponse();
}
