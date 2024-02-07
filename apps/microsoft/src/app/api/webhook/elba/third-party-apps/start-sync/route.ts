import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startThirdPartyAppsSync } from './service';

export const dynamic = 'force-dynamic';
// this route can use edge runtime as it's just sending an inngest event
export const preferredRegion = 'fra1';
export const runtime = 'edge';

export const POST = async (req: NextRequest) => {
  const eventData: unknown = await req.json();
  const { organisationId } = parseWebhookEventData('third_party_apps.scan_triggered', eventData);

  await startThirdPartyAppsSync(organisationId);

  return new NextResponse();
};
