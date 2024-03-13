import { beforeEach } from 'vitest';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';

// Delete every entries in the database between each tests
beforeEach(async () => {
  await db.delete(channelsTable);
  await db.delete(organisationsTable);
});
