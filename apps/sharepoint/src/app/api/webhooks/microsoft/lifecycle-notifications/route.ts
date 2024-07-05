import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { lifecycleEventArraySchema } from '@/connectors/microsoft/lifecycle-events/lifecycle-events';
import { getValidSubscriptions } from '@/common/subscriptions';
import { handleLifecycleNotifications } from './service';

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

  const result = lifecycleEventArraySchema.safeParse(data);

  if (!result.success || !result.data.value.length) {
    return new NextResponse(null, { status: 202 });
  }

  const subscriptionsReauthorizationRequired = result.data.value.filter(
    ({ lifecycleEvent }) => lifecycleEvent === 'reauthorizationRequired'
  );

  const subscriptions = await getValidSubscriptions(
    subscriptionsReauthorizationRequired.map(({ organizationId, ...subscription }) => ({
      ...subscription,
      tenantId: organizationId,
    }))
  );

  await handleLifecycleNotifications(subscriptions);

  return NextResponse.json(null, { status: 202 });
}
