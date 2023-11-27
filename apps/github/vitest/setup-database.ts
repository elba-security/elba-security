import { beforeEach } from 'vitest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';

beforeEach(async () => {
  await db.delete(Organisation);
});
