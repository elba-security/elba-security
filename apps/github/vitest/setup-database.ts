import { beforeEach } from 'vitest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

beforeEach(async () => {
  await db.delete(organisationsTable);
});
