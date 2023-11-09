import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { SyncJob, type SyncJobType, db } from '../../database';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

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

export const insertSyncJobs = async (values: PgInsertValue<typeof SyncJob>[]) => {
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

export const getStartedSyncJob = async (installationId: number, type: SyncJobType) => {
  const [syncJob] = await db
    .select()
    .from(SyncJob)
    .where(
      and(
        eq(SyncJob.installationId, installationId),
        eq(SyncJob.status, 'started'),
        eq(SyncJob.type, type)
      )
    );

  if (!syncJob) {
    throw new Error(`Could not found SyncJob with id=${installationId} and type=${type}`);
  }

  return syncJob;
};

export const getStartableSyncJobsInstallationIds = async (type: SyncJobType, limit: number) => {
  const syncJobs = await db
    .select({ installationId: SyncJob.installationId })
    .from(SyncJob)
    .orderBy(asc(SyncJob.createdAt))
    .where(and(eq(SyncJob.status, 'scheduled'), eq(SyncJob.type, type)))
    .limit(limit);

  return syncJobs.map(({ installationId }) => installationId);
};

export const getStartedSyncJobsCount = async (type: SyncJobType) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(SyncJob)
    .where(and(eq(SyncJob.status, 'started'), eq(SyncJob.type, type)));
  if (!result) {
    throw new Error('Could not count started syncJobs');
  }
  return result.count;
};

export const updateSyncJobsStatusToStarted = async (
  installationIds: number[],
  type: SyncJobType
) => {
  return await db
    .update(SyncJob)
    .set({ status: 'started' })
    .where(and(inArray(SyncJob.installationId, installationIds), eq(SyncJob.type, type)));
};
