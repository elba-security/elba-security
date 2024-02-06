import { NextResponse } from 'next/server';
import { startThirdPartySync } from './service';
import { parseWebhookEventData } from '@elba-security/sdk';

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('third_party_apps.scan_triggered', data);

  const response = await startThirdPartySync(organisationId);

  return NextResponse.json(response);
}
