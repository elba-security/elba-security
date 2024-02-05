import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { fetchDataProtectionObjectContent } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  // eslint-disable-next-line -- metadata type is any
  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.content_requested',
    data
  );

  const content = await fetchDataProtectionObjectContent({
    organisationId,
    metadata, // eslint-disable-line -- metadata type is any,
  });

  return new NextResponse(content);
};
