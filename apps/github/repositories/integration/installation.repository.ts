import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { Installation, db } from '../../database';

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
