import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUserRequest } from './service';

export async function DELETE(request: Request) {
  const data: unknown = await request.json();
  const { id, organisationId } = parseWebhookEventData('users.delete_user_requested', data);

  await deleteUserRequest({
    id,
    organisationId,
    region: 'eu',
  });

  return new NextResponse();
}
