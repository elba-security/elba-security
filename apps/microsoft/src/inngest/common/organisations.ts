import { and, eq } from 'drizzle-orm/sql';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const getOrganisation = async (id: string) => {
  const [organisation] = await db
    .select()
    .from(organisationsTable)
    .where(and(eq(organisationsTable.id, id), eq(organisationsTable.isDeleted, false)));

  if (!organisation) {
    throw new NonRetriableError(`Could not retrieve organisation with id=${id}`);
  }

  return organisation;
};
