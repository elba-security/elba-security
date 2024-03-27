import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchDataProtectionContent } from '@/app/api/webhooks/elba/data-protection/fetch-content/service';
import { elbaPayloadSchema } from '@/app/api/webhooks/elba/data-protection/schemes';

export const POST = async (request: NextRequest) => {
  const data = (await request.json()) as object;

  const result = elbaPayloadSchema.safeParse(data);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const message = await fetchDataProtectionContent(result.data);

  if (!message) {
    return NextResponse.json({ error: 'Data protection object not received' }, { status: 400 });
  }

  return new NextResponse(message.body.content);
};
