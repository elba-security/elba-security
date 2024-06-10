import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { z } from 'zod';
import { refreshObject } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const baseSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  metadata: z.object({
    siteId: z.string(),
    driveId: z.string(),
  }),
});

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const webhookData = parseWebhookEventData('data_protection.refresh_object_requested', data);

  await refreshObject(baseSchema.parse(webhookData));

  return new NextResponse();
}
