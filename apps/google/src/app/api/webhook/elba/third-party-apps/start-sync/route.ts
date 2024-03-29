import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { startThirdPartyAppsSync } from './service';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId } = parseWebhookEventData('third_party_apps.start_sync_requested', data);

  await startThirdPartyAppsSync(organisationId);

  return new NextResponse();
};
