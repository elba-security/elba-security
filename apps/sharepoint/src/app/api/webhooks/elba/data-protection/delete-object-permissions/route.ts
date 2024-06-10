import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteObjectPermissions } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const baseSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  metadata: z.object({
    siteId: z.string(),
    driveId: z.string(),
  }),
  permissions: z.array(z.object({ id: z.string() })),
});

export async function POST(request: Request) {
  const data: unknown = await request.json();

  const webhookData = parseWebhookEventData(
    'data_protection.delete_object_permissions_requested',
    data
  );

  await deleteObjectPermissions(baseSchema.parse(webhookData));

  return new NextResponse();
}
