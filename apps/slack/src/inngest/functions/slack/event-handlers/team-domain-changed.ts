import { eq } from 'drizzle-orm';
import { teams } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const teamDomainChangedHandler: SlackEventHandler<'team_domain_changed'> = async (
  { team_id: teamId, event: { url } },
  { step }
) => {
  await db
    .update(teams)
    .set({
      url,
    })
    .where(eq(teams.id, teamId));

  // We need to update every objects url
  await step.sendEvent('synchronize-conversations', {
    name: 'conversations/synchronize',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: new Date().toISOString(),
    },
  });

  return { message: 'Team domain changed', teamId, url };
};
