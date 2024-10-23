import { createWebhookRoute } from '@elba-security/nextjs';
import { deleteUsers } from './service';

export const POST = createWebhookRoute('users.delete_users_requested', deleteUsers);
