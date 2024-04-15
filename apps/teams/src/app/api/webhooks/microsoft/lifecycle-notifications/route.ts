import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/service';
import type { MicrosoftSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import type { WebhookResponse } from '@/app/api/webhooks/microsoft/event-handler/types';
import { lifecycleEventSchema } from '@/app/api/webhooks/microsoft/lifecycle-notifications/schema';

export const preferredRegion = 'fra1';
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

  const data = (await req.json()) as WebhookResponse<object>;

  const subscriptionsToUpdate = data.value.reduce<MicrosoftSubscriptionEvent[]>(
    (acum, subscription) => {
      const result = lifecycleEventSchema.safeParse(subscription);

      if (result.success) {
        if (result.data.lifecycleEvent === 'reauthorizationRequired') {
          return [...acum, result.data];
        }
      }
      return acum;
    },
    []
  );

  await handleSubscriptionEvent(subscriptionsToUpdate);

  return NextResponse.json({}, { status: 202 });
}
