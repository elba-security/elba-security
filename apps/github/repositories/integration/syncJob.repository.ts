import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { SyncJob, type SyncJobType, db } from '../../database';
import { and, eq, sql } from 'drizzle-orm';

export const updateSyncJob = async (
  installationId: number,
  type: SyncJobType,
  values: Omit<PgUpdateSetSource<typeof SyncJob>, 'updatedAt'>
) => {
  return await db
    .update(SyncJob)
    .set({
      ...values,
      updatedAt: sql`now()`,
    })
    .where(and(eq(SyncJob.installationId, installationId), eq(SyncJob.type, type)));
};

export const insertSyncJob = async (values: PgInsertValue<typeof SyncJob>) => {
  return await db.insert(SyncJob).values(values).onConflictDoNothing();
};

export const deleteSyncJob = async (installationId: number, type: SyncJobType) => {
  return await db
    .delete(SyncJob)
    .where(and(eq(SyncJob.installationId, installationId), eq(SyncJob.type, type)));
};

export const getStartedSyncJobs = async (type: SyncJobType) => {
  return await db
    .select()
    .from(SyncJob)
    .where(and(eq(SyncJob.status, 'started'), eq(SyncJob.type, type)));
};
