import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const startThirdPartyAppsSync = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      region: organisationsTable.region,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve an organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'microsoft/third_party_apps.sync.requested',
    data: {
      organisationId,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      skipToken: null,
    },
  });
};
