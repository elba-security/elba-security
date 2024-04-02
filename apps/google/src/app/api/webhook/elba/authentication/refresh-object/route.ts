import { parseWebhookEventData } from '@elba-security/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { refreshAuthenticationObject } from './service';

export const POST = async (request: NextRequest) => {
  const data: unknown = await request.json();

  const { organisationId, id: userId } = parseWebhookEventData(
    'authentication.refresh_object_requested',
    data
  );

  await refreshAuthenticationObject({ organisationId, userId });

  return new NextResponse();
};
