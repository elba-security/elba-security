import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SubscribeData } from '@/app/api/webhook/types';
import { handleWebhook } from '@/app/api/webhook/service';

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('validationToken')) {
    return new NextResponse(req.nextUrl.searchParams.get('validationToken'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const data = (await req.json()) as SubscribeData;

  await handleWebhook(data);

  return NextResponse.json({}, { status: 202 });
}
