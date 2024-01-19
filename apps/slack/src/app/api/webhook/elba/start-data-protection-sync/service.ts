import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const startDataProtectionSync = async (organisationId: string) => {
  const team = await db.query.teams.findFirst({
    where: eq(teams.elbaOrganisationId, organisationId),
    columns: {
      id: true,
    },
  });

  if (!team) {
    throw new Error('Failed to find team');
  }

  await inngest.send({
    name: 'conversations/synchronize',
    data: {
      isFirstSync: true,
      syncStartedAt: new Date().toISOString(),
      teamId: team.id,
    },
  });
};
