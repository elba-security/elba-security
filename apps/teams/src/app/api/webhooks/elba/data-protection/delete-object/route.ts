import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { deleteDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/delete-object/service';
import { elbaPayloadSchema } from '@/app/api/webhooks/elba/data-protection/schemes';

export const POST = async (request: NextRequest) => {
  const data = (await request.json()) as object;

  const result = elbaPayloadSchema.safeParse(data);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  await deleteDataProtectionObject(result.data);

  return new NextResponse();
};
