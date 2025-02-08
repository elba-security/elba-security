import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const startDataProtectionSync = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    return;
  }

  await inngest.send([
    {
      name: 'teams/teams.sync.requested',
      data: {
        organisationId,
        syncStartedAt: new Date().toISOString(),
        skipToken: null,
        isFirstSync: true,
      },
    },
    {
      name: 'teams/channels.subscription.requested',
      data: {
        organisationId,
        tenantId: organisation.tenantId,
      },
    },
  ]);
};
