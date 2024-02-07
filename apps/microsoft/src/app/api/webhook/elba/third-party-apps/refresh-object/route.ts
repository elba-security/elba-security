import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { ZodError } from 'zod';
import { logger } from '@elba-security/logger';
import { refreshThirdPartyAppsObject } from './service';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const runtime = 'edge';

export const POST = async (req: NextRequest) => {
  const eventData: unknown = await req.json();
  try {
    const data = parseWebhookEventData('third_party_apps.refresh_object_requested', eventData);
    await refreshThirdPartyAppsObject(data);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Could not validate event data', { error });
      // Bad request response prevent elba to retry sending the event
      return new NextResponse('Could not validate event data', { status: 400 });
    }
    throw error;
  }

  return new NextResponse();
};
