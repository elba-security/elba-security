import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.elbaOrganisationId, organisationId),
    columns: {
      id: true,
    },
  });

  if (!team) {
    throw new Error('Failed to find team');
  }

  await inngest.send({
    name: 'slack/conversations.sync.requested',
    data: {
      isFirstSync: true,
      syncStartedAt: new Date().toISOString(),
      teamId: team.id,
    },
  });
};
