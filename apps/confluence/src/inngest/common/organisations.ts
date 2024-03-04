import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const getOrganisation = async (organisationId: string) => {
  const [row] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));
  if (!row) throw new NonRetriableError(`Could not retrieve organisation`);
  return row;
};
