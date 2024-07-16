import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { WebhookResponse } from '@/app/api/webhooks/microsoft/event-handler/types';
import { getSubscriptionsFromDB } from '@/common/get-db-subscriptions';
import { isClientStateValid } from '@/common/validate-client-state';
import { lifecycleEventArraySchema } from '@/connectors/microsoft/lifecycle-events/lifecycle-events';
import { handleSubscriptionEvent } from './service';

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

  const parseResult = lifecycleEventArraySchema.safeParse(data);

  if (!parseResult.success) {
    // TODO: log
    return new NextResponse('', { status: 202 });
  }

  const { value } = parseResult.data;

  const updatedValue = value.map((v) => ({ ...v, tenantId: v.organizationId }));

  const subscriptionsData = await getSubscriptionsFromDB(updatedValue);

  const isValid = isClientStateValid({
    dbSubscriptions: subscriptionsData,
    webhookSubscriptions: updatedValue,
  });

  if (!isValid) {
    // TODO: log
    return new NextResponse('', { status: 202 });
  }

  await handleSubscriptionEvent(
    updatedValue.filter(
      (subscriptionToUpdate) => subscriptionToUpdate.lifecycleEvent === 'reauthorizationRequired'
    )
  );

  return NextResponse.json({}, { status: 202 });
}
