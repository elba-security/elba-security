import { createWebhookRoute } from '@elba-security/nextjs';
import { deleteThirdPartyAppsObject } from './service';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'third_party_apps.delete_object_requested',
  deleteThirdPartyAppsObject
);
