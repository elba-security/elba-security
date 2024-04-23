import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUser } from './service';

export async function DELETE(request: Request) {
  const data: unknown = await request.json();

  const { id: userId, organisationId } = parseWebhookEventData('users.delete_user_requested', data);

  await deleteUser({
    userId,
    organisationId,
  });

  return new NextResponse();
}
