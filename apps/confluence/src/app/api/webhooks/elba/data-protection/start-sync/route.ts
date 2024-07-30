import { createWebhookRoute } from '@elba-security/nextjs';
import { startDataProtectionSync } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'data_protection.start_sync_requested',
  startDataProtectionSync
);
