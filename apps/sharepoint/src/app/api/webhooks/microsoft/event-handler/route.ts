import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleWebhook } from '@/app/api/webhooks/microsoft/event-handler/service';
import { getSubscriptionsFromDB } from '@/common/get-db-subscriptions';
import { isClientStateValid } from '@/common/validate-client-state';

export const subscriptionSchema = z.object({
  subscriptionId: z.string(),
  resource: z.string(),
  tenantId: z.string(),
  clientState: z.string(),
});

const subscriptionArray = z.object({ value: z.array(subscriptionSchema) });

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

  const parseResult = subscriptionArray.safeParse(data);

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
