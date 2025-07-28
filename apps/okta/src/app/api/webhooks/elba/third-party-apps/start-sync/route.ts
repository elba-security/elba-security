import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const { organisationId, region, nangoConnectionId } = parseWebhookEventData(
    'third_party_apps.start_sync_requested',
    data
  );

  await inngest.send({
    name: 'okta/third_party_apps.sync.requested',
    data: {
      organisationId,
      region,
      nangoConnectionId: nangoConnectionId || '',
      syncStartedAt: new Date().toISOString(),
      isFirstSync: false,
    },
  });

  return NextResponse.json({ message: 'Third-party apps sync requested' });
}
