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
