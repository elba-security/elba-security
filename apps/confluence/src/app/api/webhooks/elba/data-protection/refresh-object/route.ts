import { createWebhookRoute } from '@elba-security/nextjs';
import { refreshDataProtectionObject } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'data_protection.refresh_object_requested',
  refreshDataProtectionObject
);
