import { eq } from 'drizzle-orm';
import { db, organisations } from '@/database';

export const getOrganisationsToSync = async () => {
  return db
    .select({
      organisationId: organisations.organisationId,
    })
    .from(organisations);
};

export const getOrganisationAccessDetails = async (organisationId: string) => {
  return db
    .select({
      accessToken: organisations.accessToken,
      pathRoot: organisations.rootNamespaceId,
      adminTeamMemberId: organisations.adminTeamMemberId,
      region: organisations.region,
    })
    .from(organisations)
    .where(eq(organisations.organisationId, organisationId));
};
