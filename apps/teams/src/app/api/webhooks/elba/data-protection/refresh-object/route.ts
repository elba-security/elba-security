import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { elbaPayloadSchema } from '@/app/api/webhooks/elba/data-protection/schemes';
import { refreshData } from '@/app/api/webhooks/elba/data-protection/refresh-object/service';

export const POST = async (request: NextRequest) => {
  const data = (await request.json()) as object;

  const result = elbaPayloadSchema.safeParse(data);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  await refreshData(result.data);
  return new NextResponse();
};
