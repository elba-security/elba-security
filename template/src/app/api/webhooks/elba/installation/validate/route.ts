import { NextResponse, type NextRequest } from 'next/server';
import { parseWebhookEventData } from '@elba-security/sdk';
import { validateSourceInstallation } from './service';

/**
 * Webhook endpoint for handling installation validation requests from Elba.
 * This endpoint:
 * 1. Receives the webhook payload from Elba
 * 2. Validates the installation by checking access to your API
 * 3. Triggers initial user synchronization if validation succeeds
 *
 * Expected webhook payload:
 * ```json
 * {
 *   "organisationId": "string", // The Elba organization ID
 *   "region": "string",        // The region (e.g., "eu", "us")
 *   "nangoConnectionId": "string" // The Nango connection ID for OAuth
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const data: unknown = await request.json();
    const { organisationId, region, nangoConnectionId } = parseWebhookEventData(
      'installation.validation.requested',
      data
    );

    const result = await validateSourceInstallation({ organisationId, region, nangoConnectionId });

    return NextResponse.json(result);
  } catch (error) {
    // Handle JSON parsing errors or invalid webhook data
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }
    // Handle other validation errors
    return NextResponse.json({ message: 'Invalid webhook payload' }, { status: 400 });
  }
}
