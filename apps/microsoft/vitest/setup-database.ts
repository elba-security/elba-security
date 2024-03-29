import { beforeEach } from 'vitest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

// Delete every entries in the database between each tests
beforeEach(async () => {
  await db.delete(organisationsTable);
});
