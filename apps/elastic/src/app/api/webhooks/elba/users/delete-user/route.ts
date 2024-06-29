import type { NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUser } from './service';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const { id: userId, organisationId } = parseWebhookEventData(`users.delete_user_requested`, data);

  await deleteUser({ userId, organisationId });
}
