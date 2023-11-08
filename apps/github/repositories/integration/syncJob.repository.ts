import { PgInsertValue } from 'drizzle-orm/pg-core';
import { SyncJob, db } from '../../database';

export const insertSyncJob = async (values: PgInsertValue<typeof SyncJob>) => {
  return await db.insert(SyncJob).values(values).onConflictDoNothing();
};
