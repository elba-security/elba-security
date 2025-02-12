import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
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
    logger.error('Missing nango connection ID', { organisationId });
    throw new Error('Missing nango connection ID');
  }

  await deleteUsers({ organisationId, region, nangoConnectionId, userIds });

  return new NextResponse();
}
