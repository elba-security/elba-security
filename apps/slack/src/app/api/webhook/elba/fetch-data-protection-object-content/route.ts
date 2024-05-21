import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { LOG_SCOPE, fetchDataProtectionObjectContent } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  logger.info('Retrieving json body', { scope: LOG_SCOPE });
  const data: unknown = await request.json();

  logger.info('Parsing body', { scope: LOG_SCOPE });
  const { organisationId, metadata } = parseWebhookEventData(
    'data_protection.content_requested',
    data
  );

  const content = await fetchDataProtectionObjectContent({ organisationId, metadata });

  logger.info('Returning message content', { scope: LOG_SCOPE });
  return new NextResponse(content);
};
