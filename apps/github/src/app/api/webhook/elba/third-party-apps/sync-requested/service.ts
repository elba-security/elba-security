import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const handleThirdPartyAppsSyncRequested = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      installationId: organisationsTable.installationId,
      accountLogin: organisationsTable.accountLogin,
      region: organisationsTable.region,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve an organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'github/third_party_apps.page_sync.requested',
    data: {
      organisationId,
      installationId: organisation.installationId,
      accountLogin: organisation.accountLogin,
      region: organisation.region,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });

  return { success: true };
};
