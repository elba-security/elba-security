import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { LifecycleEventResponse } from '@/app/api/lifecycleNotifications/service';
import { handleSubscribeEvent } from '@/app/api/lifecycleNotifications/service';

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('validationToken')) {
    return new NextResponse(req.nextUrl.searchParams.get('validationToken'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const data = (await req.json()) as LifecycleEventResponse;

  await handleSubscribeEvent(data);

  return NextResponse.json({}, { status: 202 });
}
