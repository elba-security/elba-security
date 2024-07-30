import { createWebhookRoute } from '@elba-security/nextjs';
import { refreshThirdPartyAppsObject } from './service';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'third_party_apps.refresh_object_requested',
  refreshThirdPartyAppsObject
);
