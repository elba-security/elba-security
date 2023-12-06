// app/api/users/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from './service';
import { WebhookData } from '@/types';

// Receive webhooks event
export async function POST(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const x_HookSecret = requestHeaders.get('X-Hook-Secret');

  if (x_HookSecret) {
    // Respond with the X-Hook-Secret header to complete the handshake
    return new NextResponse(JSON.stringify({ success: true, message: 'OK' }), {
      status: 200,
      headers: { 'X-Hook-Secret': x_HookSecret },
    });
  }

  // Process the webhook notification
  try {
    const requestData: WebhookData = await request.json();
    await handleWebhookEvent(requestData);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ name: 'error', message: error.message }, { status: 500 });
  }
}
