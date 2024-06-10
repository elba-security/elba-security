import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { WebhookResponse } from '@/app/api/webhooks/microsoft/event-handler/types';
import { getSubscriptionsFromDB } from '@/common/get-db-subscriptions';
import { isClientStateValid } from '@/common/validate-client-state';
import { handleSubscriptionEvent } from './service';

export const lifecycleEventSchema = z.object({
  subscriptionId: z.string(),
  lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
  // This is actually a tenantId, for some reason MS send different name even if in documentation it said otherwise
  organizationId: z.string(),
  clientState: z.string(),
});

const lifecycleEventArray = z.object({ value: z.array(lifecycleEventSchema) });

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

  const parseResult = lifecycleEventArray.safeParse(data);

  if (!parseResult.success) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  const { value } = parseResult.data;

  const updatedValue = value.map((v) => ({ ...v, tenantId: v.organizationId }));

  const subscriptionsData = await getSubscriptionsFromDB(updatedValue);

  const isValid = isClientStateValid({
    dbSubscriptions: subscriptionsData,
    webhookSubscriptions: updatedValue,
  });

  if (!isValid) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  await handleSubscriptionEvent(
    updatedValue.filter(
      (subscriptionToUpdate) => subscriptionToUpdate.lifecycleEvent === 'reauthorizationRequired'
    )
  );

  return NextResponse.json({}, { status: 202 });
}
