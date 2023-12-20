import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';

export const getOrganizationByTenantId = async (tenantId: string) => {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.tenantId, tenantId));

  if (!organization) {
    throw new NonRetriableError(`Organization with tenantId=${tenantId} not found`);
  }

  return organization;
};
