import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startThirdPartySync } from './service';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('third_party_apps.start_sync_requested', data);

  await startThirdPartySync(organisationId);

  return new NextResponse();
}
