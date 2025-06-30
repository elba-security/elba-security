import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const startThirdPartyAppsSync = async (organisationId: string) => {
  const [organisation] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not find organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'outlook/third_party_apps.sync.requested',
    data: {
      organisationId,
      region: organisation.region as 'eu' | 'us',
      syncStartedAt: new Date().toISOString(),
      lastSyncStartedAt: null,
      pageToken: null,
      tenantId: organisation.tenantId,
    },
  });
};
