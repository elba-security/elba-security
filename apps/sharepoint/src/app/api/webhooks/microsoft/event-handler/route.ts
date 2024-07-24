import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleWebhookEvents } from '@/app/api/webhooks/microsoft/event-handler/service';
import { getValidSubscriptions } from '@/common/subscriptions';
import { incomingSubscriptionArraySchema } from '@/connectors/microsoft/subscriptions/subscriptions';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('validationToken')) {
    return new NextResponse(req.nextUrl.searchParams.get('validationToken'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const data: unknown = await req.json();

  const result = incomingSubscriptionArraySchema.safeParse(data);

  if (!result.success || !result.data.value.length) {
    return new NextResponse(null, { status: 202 });
  }

  const subscriptions = await getValidSubscriptions(result.data.value);

  await handleWebhookEvents(subscriptions);

  return new NextResponse(null, { status: 202 });
}
