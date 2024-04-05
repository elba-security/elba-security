import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUserRequest } from './service';

export async function DELETE(request: NextRequest) {
  const data: unknown = await request.json();
  const { id, organisationId } = parseWebhookEventData('users.delete_user_requested', data);

  await deleteUserRequest({
    id,
    organisationId,
    region: 'eu',
  });

  return new NextResponse();
}
