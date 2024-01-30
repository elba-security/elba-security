import { NextResponse, type NextRequest } from 'next/server';
import { handleSlackWebhookMessage } from './service';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export const POST = async (request: NextRequest) => {
  const result = await handleSlackWebhookMessage(request);
  if (result) {
    return NextResponse.json(result);
  }

  return new NextResponse();
};
