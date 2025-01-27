import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { deleteUsers } from './service';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const {
    ids: userIds,
    organisationId,
    region,
    nangoConnectionId,
  } = parseWebhookEventData('users.delete_users_requested', data);

  if (!nangoConnectionId) {
    throw new Error(
      `Nango connection id was not provided for the organisation with ID ${organisationId}`
    );
  }

  await deleteUsers({ organisationId, region, nangoConnectionId, userIds });

  return new NextResponse();
}
