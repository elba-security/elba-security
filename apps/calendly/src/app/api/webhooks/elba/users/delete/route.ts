import { NextResponse } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUserRequest } from './service';

export async function DELETE(request: Request) {
  const data: unknown = await request.json();

  const { id, organisationId } = parseWebhookEventData('users.delete_user_requested', data);

  const userId: string = id as string; // Explicitly type id as string

  await deleteUserRequest({
    id: userId,
    organisationId,
  });

  return new NextResponse();
}
