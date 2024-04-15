import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleWebhook } from '@/app/api/webhooks/microsoft/event-handler/service';
import type {
  SubscriptionPayload,
  WebhookResponse,
} from '@/app/api/webhooks/microsoft/event-handler/types';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const subscriptionSchema = z.object({
  subscriptionId: z.string(),
  changeType: z.enum(['created', 'updated', 'deleted']),
  resource: z.string(),
  tenantId: z.string(),
});

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('validationToken')) {
    return new NextResponse(req.nextUrl.searchParams.get('validationToken'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const data = (await req.json()) as WebhookResponse<object>;

  const subscriptions = data.value.reduce<SubscriptionPayload[]>((acum, subscription) => {
    const result = subscriptionSchema.safeParse(subscription);

    if (result.success) {
      return [...acum, result.data];
    }
    return acum;
  }, []);

  await handleWebhook(subscriptions);

  return NextResponse.json({}, { status: 202 });
}
