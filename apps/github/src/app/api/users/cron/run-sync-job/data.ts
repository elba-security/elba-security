import { and, asc, eq, lt, sql } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { Installation, InstallationAdmin, UsersSyncJob, db } from '@/database';

export const initUsersSyncJobSyncStartedAt = async (installationId: number) => {
  const [syncJob] = await db
    .update(UsersSyncJob)
    .set({
      syncStartedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(UsersSyncJob.installationId, installationId))
    .returning({ syncStartedAt: UsersSyncJob.syncStartedAt });

  if (!syncJob?.syncStartedAt) {
    throw new Error('Could not init users_sync_job sync_started_at');
  }

  return syncJob.syncStartedAt;
};

export const updateUsersSyncJobCursor = (installationId: number, cursor: string) =>
  db
    .update(UsersSyncJob)
    .set({
      cursor,
      updatedAt: sql`now()`,
    })
    .where(eq(UsersSyncJob.installationId, installationId));

export type UsersSyncJobWithInstallation = NonNullable<
  Awaited<ReturnType<typeof getUsersSyncJobWithInstallation>>
>;

export const getUsersSyncJobWithInstallation = async () => {
  const [result] = await db
    .select()
    .from(UsersSyncJob)
    .where(lt(UsersSyncJob.retryAfter, sql`now()`))
    .leftJoin(Installation, eq(UsersSyncJob.installationId, Installation.id))
    .orderBy(asc(UsersSyncJob.priority), asc(UsersSyncJob.syncStartedAt))
    .limit(1);

  if (!result) {
    return null;
  }

  if (!result.installation) {
    throw new Error('Picked users_sync_job is missing installation');
  }

  return {
    ...result.users_sync_jobs,
    installation: result.installation,
  };
};

export const insertInstallationAdmins = (
  admins: PgInsertValue<typeof InstallationAdmin>[],
  lastSyncAt: Date
) =>
  db
    .insert(InstallationAdmin)
    .values(admins)
    .onConflictDoUpdate({
      target: [InstallationAdmin.adminId, InstallationAdmin.installationId],
      set: {
        lastSyncAt,
        updatedAt: sql`now()`,
      },
    });

export const deleteInstallationAdminsSyncedBefore = (installationId: number, lastSyncAt: Date) =>
  db
    .delete(InstallationAdmin)
    .where(
      and(
        eq(InstallationAdmin.installationId, installationId),
        lt(InstallationAdmin.lastSyncAt, lastSyncAt)
      )
    );

export const deleteUsersSyncJob = (installationId: number) =>
  db.delete(UsersSyncJob).where(eq(UsersSyncJob.installationId, installationId));

export const updateUsersSyncJobRetryCount = (installationId: number, retryCount: number) =>
  db
    .update(UsersSyncJob)
    .set({ retryCount, updatedAt: sql`now()` })
    .where(eq(UsersSyncJob.installationId, installationId));

export const updateUsersSyncJobRetryAfter = (installationId: number, retryAfter: Date) =>
  db
    .update(UsersSyncJob)
    .set({ retryAfter, updatedAt: sql`now()` })
    .where(eq(UsersSyncJob.installationId, installationId));
