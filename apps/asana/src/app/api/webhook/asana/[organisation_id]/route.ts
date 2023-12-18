import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { handleWebhookEvent, registerWebhookSecret, verifyAsanaRequest } from './service';
import type { WebhookEvent } from './types';

// Remove the next line if your integration does not works with edge runtime
export const preferredRegion = env.VERCEL_PREFERRED_REGION;
// Remove the next line if your integration does not works with edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');

  if (!organisationId) {
    throw new Error('Missing path params organisation_id');
  }

  const webhookSecret = request.headers.get('x-hook-secret');

  if (webhookSecret) {
    await registerWebhookSecret(organisationId, webhookSecret);

    return new Response(null, { status: 204, headers: { 'X-Hook-Secret': webhookSecret } });
  }

  const signature = request.headers.get('x-hook-signature');

  if (!signature) {
    throw new Error('Missing Asana webhook signature header');
  }

  const body = await request.text();

  // Verify the request
  if (!(await verifyAsanaRequest(body, organisationId, signature))) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const event = JSON.parse(body) as WebhookEvent;

  await handleWebhookEvent(event, organisationId);

  return new NextResponse();
}
