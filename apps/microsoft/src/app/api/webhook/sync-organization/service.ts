import { eq } from 'drizzle-orm/sql';
import { organizations } from '@/schemas';
import { db } from '@/lib/db';
import { inngest } from '../../inngest/client';

export const syncOrganization = async (organizationId: string) => {
  const [organization] = await db
    .select({
      tenantId: organizations.tenantId,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (!organization) {
    throw new Error(`Could not retrieve an organisation with id=${organizationId}`);
  }

  await inngest.send({
    name: 'third-party-apps/start',
    data: {
      tenantId: organization.tenantId,
      isFirstScan: false,
      syncStartedAt: Date.now(),
      cursor: null,
    },
  });

  return { success: true };
};
