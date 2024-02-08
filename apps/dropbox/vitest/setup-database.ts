import { beforeEach } from 'vitest';
import { organisations, db } from '@/database';

beforeEach(async () => {
  await db.delete(organisations);
});
