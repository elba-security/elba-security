// app/api/users/webhook/service.ts
import { sql } from '@vercel/postgres';
import { WebhookData } from '@/types';

export async function handleWebhookEvent(requestData: WebhookData): Promise<void> {
  const organisationId = requestData.data?.resource?.gid;
  if (!organisationId) {
    throw new Error('No data', { cause: 'No Organisation ID' });
  }
  // Insert a sync job for the organization with priority 1
  await sql`
      INSERT INTO users_sync_jobs (organisation_id, priority, sync_started_at)
      VALUES (${organisationId}, 1, NOW()) ON CONFLICT (organisation_id) DO UPDATE
      SET
        priority = EXCLUDED.priority,
        sync_started_at = EXCLUDED.sync_started_at;
      `;
}
