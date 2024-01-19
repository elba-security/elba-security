import { beforeEach } from 'vitest';
import { teams } from '@/database/schema';
import { db } from '@/database/client';

beforeEach(async () => {
  await db.delete(teams);
});
