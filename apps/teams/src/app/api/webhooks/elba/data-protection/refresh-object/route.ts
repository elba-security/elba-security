import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { refreshDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/refresh-object/service';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  // eslint-disable-next-line -- metadata type is any
  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.refresh_object_requested',
    data
  );

  await refreshDataProtectionObject({
    organisationId,
    metadata, // eslint-disable-line -- metadata type is any,
  });

  return new NextResponse();
};
