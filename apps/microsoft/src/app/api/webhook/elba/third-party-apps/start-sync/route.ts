import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startThirdPartyAppsSync } from './service';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'cle1';
export const runtime = 'edge';

export const POST = async (req: NextRequest) => {
  const eventData: unknown = await req.json();
  const { organisationId } = parseWebhookEventData(
    'third_party_apps.start_sync_requested',
    eventData
  );

  await startThirdPartyAppsSync(organisationId);

  return new NextResponse();
};
