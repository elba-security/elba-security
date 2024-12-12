import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { validateSourceInstallation } from './service';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const { organisationId, region, nangoConnectionId } = parseWebhookEventData(
    'installation.validation.requested',
    data
  );

  const result = await validateSourceInstallation({ organisationId, region, nangoConnectionId });

  return NextResponse.json(result);
}
