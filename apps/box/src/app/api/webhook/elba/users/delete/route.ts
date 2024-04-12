import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUsers } from './service';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();

  const { id: userId, organisationId } = parseWebhookEventData(`users.delete_user_requested`, data);

  await deleteUsers({ userId, organisationId });

  return new NextResponse();
}
