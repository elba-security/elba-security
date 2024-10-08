import { createWebhookRoute } from '@elba-security/nextjs';
import { deleteDataProtectionObjectPermissions } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute(
  'data_protection.delete_object_permissions_requested',
  deleteDataProtectionObjectPermissions
);
