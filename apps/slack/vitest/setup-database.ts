import { beforeEach } from 'vitest';
import { teamsTable } from '@/database/schema';
import { db } from '@/database/client';

// As slack doesn't have an `organisations` table, we need this specific script to manually delete data from `teams` table
beforeEach(async () => {
  await db.delete(teamsTable);
});
