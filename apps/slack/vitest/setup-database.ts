import { beforeEach } from 'vitest';
import { teamsTable } from '@/database/schema';
import { db } from '@/database/client';

beforeEach(async () => {
  await db.delete(teamsTable);
});
