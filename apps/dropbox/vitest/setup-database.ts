import { beforeEach } from 'vitest';
import { tokens, db } from '@/database';

beforeEach(async () => {
  await db.delete(tokens);
});
