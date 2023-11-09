import { eq, sql, lt, and } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { InstallationAdmin, db } from '@/database';

export const insertInstallationAdmins = async (
  values: PgInsertValue<typeof InstallationAdmin>[],
  lastSyncAt: Date
) => {
  return await db
    .insert(InstallationAdmin)
    .values(values)
    .onConflictDoUpdate({
      target: [InstallationAdmin.adminId, InstallationAdmin.installationId],
      set: {
        lastSyncAt,
        updatedAt: sql`now()`,
      },
    });
};

export const deleteInstallationAdminsSyncedBefore = async (
  installationId: number,
  lastSyncAt: Date
) => {
  return await db
    .delete(InstallationAdmin)
    .where(
      and(
        eq(InstallationAdmin.installationId, installationId),
        lt(InstallationAdmin.lastSyncAt, lastSyncAt)
      )
    );
};
