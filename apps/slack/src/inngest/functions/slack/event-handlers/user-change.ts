import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { slackMemberSchema } from '@/connectors/slack/members';
import { createElbaClient } from '@/connectors/elba/client';
import { formatUser } from '@/connectors/elba/users/users';
import type { SlackEventHandler } from './types';

export const userChangeHandler: SlackEventHandler<'user_change'> = async ({
  team_id: teamId,
  event: { user },
}) => {
  const result = slackMemberSchema.safeParse(user);
  // TODO: is_stranger?
  // TODO: handle slack connect
  // Seems good, to confirm
  if (user.is_bot || user.team_id !== teamId || !result.success) {
    return { message: 'Ignored: invalid user', user };
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { elbaOrganisationId: true, elbaRegion: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const elbaClient = createElbaClient(team.elbaOrganisationId, team.elbaRegion);

  if (user.deleted) {
    await elbaClient.users.delete({ ids: [result.data.id] });
  } else {
    const elbaUser = formatUser(result.data);
    await elbaClient.users.update({
      users: [elbaUser],
    });
  }

  return { message: `User ${user.deleted ? 'deleted' : 'updated'}`, teamId, user };
};
