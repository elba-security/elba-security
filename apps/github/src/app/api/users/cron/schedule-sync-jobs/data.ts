import { eq, isNull } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { Installation, UsersSyncJob, db } from '@/database';

export const getSchedulableInstallationIds = async () => {
  const installations = await db
    .select({
      id: Installation.id,
    })
    .from(Installation)
    .leftJoin(UsersSyncJob, eq(Installation.id, UsersSyncJob.installationId))
    .where(isNull(UsersSyncJob));

  return installations.map(({ id }) => id);
};

export const insertUsersSyncJobs = (usersSyncJobs: PgInsertValue<typeof UsersSyncJob>[]) =>
  db.insert(UsersSyncJob).values(usersSyncJobs).onConflictDoNothing();
