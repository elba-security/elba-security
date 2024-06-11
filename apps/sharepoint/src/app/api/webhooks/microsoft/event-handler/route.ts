import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleWebhook } from '@/app/api/webhooks/microsoft/event-handler/service';
import { getSubscriptionsFromDB } from '@/common/get-db-subscriptions';
import { isClientStateValid } from '@/common/validate-client-state';
import { incomingSubscriptionArraySchema } from '@/connectors/microsoft/subscription/subscriptions';

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

  const parseResult = incomingSubscriptionArraySchema.safeParse(data);

  if (!parseResult.success) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  const { value } = parseResult.data;

  const subscriptionsData = await getSubscriptionsFromDB(value);

  const isValid = isClientStateValid({
    dbSubscriptions: subscriptionsData,
    webhookSubscriptions: value,
  });

  if (!isValid) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  await handleWebhook(value);

  return NextResponse.json({}, { status: 202 });
}
