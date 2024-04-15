import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { fetchDataProtectionContent } from '@/app/api/webhooks/elba/data-protection/fetch-content/service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.content_requested',
    data
  );

  const message = await fetchDataProtectionContent({
    organisationId,
    metadata,
  });

  if (!message) {
    return NextResponse.json({ error: 'Data protection object not received' }, { status: 400 });
  }

  return new NextResponse(message.body.content);
};
