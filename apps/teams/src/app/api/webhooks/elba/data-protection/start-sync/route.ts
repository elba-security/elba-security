import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { startDataProtectionSync } from '@/app/api/webhooks/elba/data-protection/start-sync/service';
import { startSyncSchema } from '@/app/api/webhooks/elba/data-protection/schemes';

export const POST = async (request: NextRequest) => {
  const data = (await request.json()) as object;

  const result = startSyncSchema.safeParse(data);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  await startDataProtectionSync(result.data.organisationId);

  return new NextResponse();
};
