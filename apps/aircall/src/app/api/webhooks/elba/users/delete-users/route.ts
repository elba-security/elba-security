import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUsers } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();

  const { ids: userIds, organisationId } = parseWebhookEventData(
    'users.delete_users_requested',
    data
  );

  await deleteUsers({ userIds, organisationId });

  return new NextResponse();
}
