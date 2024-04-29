import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/service';
import { lifecycleEventSchema } from '@/app/api/webhooks/microsoft/lifecycle-notifications/schema';
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

  const validationResult = lifecycleEventSchema.safeParse(data);

  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  const { validationTokens, value } = validationResult.data;

  const tokensToValidate = validationTokens.reduce<MicrosoftToken[]>(
    (acc, v, i) => [
      ...acc,
      {
        token: v,
        tenantId: value[i]?.organizationId || '',
      },
    ],
    []
  );

  const isTokensValid = await validateTokens(tokensToValidate);

  if (!isTokensValid) {
    return NextResponse.json({ message: 'Invalid data' }, { status: 404 });
  }

  await handleSubscriptionEvent(value);

  return NextResponse.json({}, { status: 202 });
}
