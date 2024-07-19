import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleWebhook } from '@/app/api/webhooks/microsoft/event-handler/service';
import { subscriptionSchema } from '@/app/api/webhooks/microsoft/event-handler/schema';
import type { MicrosoftToken } from '@/common/validate-tokens';
import { validateTokens } from '@/common/validate-tokens';

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

  const data = (await req.json()) as unknown;

  const validationResult = subscriptionSchema.safeParse(data);

  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  const { validationTokens, value } = validationResult.data;

  const tokensToValidate = validationTokens.reduce<MicrosoftToken[]>(
    (acc, v, i) => [
      ...acc,
      {
        token: v,
        tenantId: value[i]?.tenantId || '',
      },
    ],
    []
  );

  const isTokensValid = await validateTokens(tokensToValidate);

  if (!isTokensValid) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  await handleWebhook(value);

  return NextResponse.json({}, { status: 202 });
}
