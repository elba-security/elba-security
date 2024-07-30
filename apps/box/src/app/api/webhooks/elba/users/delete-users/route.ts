import { createWebhookRoute } from '@elba-security/nextjs';
import { deleteUsers } from './service';

export const preferredRegion = 'fra1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const POST = createWebhookRoute('users.delete_users_requested', deleteUsers);
