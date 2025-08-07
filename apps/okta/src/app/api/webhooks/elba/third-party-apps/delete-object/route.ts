import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const { organisationId, region, nangoConnectionId, userId, appId } = parseWebhookEventData(
    'third_party_apps.delete_object_requested',
    data
  );

  await inngest.send({
    name: 'okta/third_party_apps.delete.requested',
    data: {
      organisationId,
      region,
      nangoConnectionId: nangoConnectionId || '',
      appId,
      userId,
    },
  });

  return NextResponse.json({ message: 'Third-party app deletion requested' });
}
