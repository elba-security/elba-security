import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUserRequest } from './service';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();

  const { ids: userIds, organisationId } = parseWebhookEventData(
    'users.delete_users_requested',
    data
  );

  await deleteUserRequest({ userIds, organisationId });

  return new NextResponse();
}
