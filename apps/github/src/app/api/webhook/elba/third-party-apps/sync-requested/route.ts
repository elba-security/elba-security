import { createWebhookRoute } from '@elba-security/nextjs';
import { handleThirdPartyAppsSyncRequested } from './service';

export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'third_party_apps.start_sync_requested',
  handleThirdPartyAppsSyncRequested
);
