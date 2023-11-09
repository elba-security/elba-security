import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { eq, sql, lte, Column, asc } from 'drizzle-orm';
import { type SelectInstallation, Installation, db, SyncJobType } from '../../database';
import { env } from '../../env';

export const insertInstallation = async (
  values: PgInsertValue<typeof Installation> & PgUpdateSetSource<typeof Installation>
) => {
  const [installation] = await db
    .insert(Installation)
    .values(values)
    .onConflictDoUpdate({
      target: Installation.accountId,
      set: values,
    })
    .onConflictDoUpdate({
      target: Installation.elbaOrganizationId,
      set: values,
    })
    .returning();

  if (!installation) {
    throw new Error('Could not insert installation');
  }

  return installation;
};

export const updateInstallation = async (
  installationId: number,
  values: Omit<PgUpdateSetSource<typeof Installation>, 'updatedAt'>
) => {
  return await db
    .update(Installation)
    .set({
      ...values,
      updatedAt: sql`now()`,
    })
    .where(eq(Installation.id, installationId));
};

export const getInstallation = async (installationId: number): Promise<SelectInstallation> => {
  const [installation] = await db
    .select()
    .from(Installation)
    .where(eq(Installation.id, installationId));

  if (!installation) {
    throw new Error(`Could not found Installation with id=${installationId}`);
  }

  return installation;
};

const lastSyncedAtColumnType: Record<SyncJobType, Column> = {
  users: Installation.usersLastSyncedAt,
  third_party_apps: Installation.thirdPartyAppsLastSyncedAt,
};

const syncJobFrequencyType: Record<SyncJobType, number> = {
  users: env.USERS_SYNC_FREQUENCY,
  third_party_apps: env.THIRD_PARTY_APPS_SYNC_FREQUENCY,
};

export const getSchedulableInstallationIds = async (type: SyncJobType) => {
  const lastSyncedAtColumn = lastSyncedAtColumnType[type];
  const syncJobFrequency = syncJobFrequencyType[type];

  const installations = await db
    .select({
      id: Installation.id,
    })
    .from(Installation)
    .where(lte(lastSyncedAtColumn, sql`now() - INTERVAL '1 second' * ${syncJobFrequency}`));

  return installations.map(({ id }) => id);
};
