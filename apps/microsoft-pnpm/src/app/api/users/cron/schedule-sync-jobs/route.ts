import { convertMinutesToSeconds } from '@/common/utils';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { lte, sql } from 'drizzle-orm';
import { scheduleUserSyncJobs } from './service';

export const runtime = 'edge';

export async function POST(): Promise<Response> {
  try {
    const orgsToSync = await db
      .select()
      .from(organizations)
      .where(
        lte(
          organizations.lastUserScan,
          sql`now() - INTERVAL '1 second' * ${convertMinutesToSeconds(60)}}`
        )
      );
    if (!orgsToSync[0]) {
      return new Response('No organization to sync');
    }
    const result = await scheduleUserSyncJobs(orgsToSync);
    return new Response(JSON.stringify(result));
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
