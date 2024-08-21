import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from './client';
import { organisationsTable } from './schema';

export const getOrganisation = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      accessToken: organisationsTable.accessToken,
      pathRoot: organisationsTable.rootNamespaceId,
      adminTeamMemberId: organisationsTable.adminTeamMemberId,
      region: organisationsTable.region,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
  }

  return organisation;
};
