import { eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { slackMemberSchema } from '@/connectors/slack/members';
import { createElbaClient } from '@/connectors/elba/client';
import { formatUser } from '@/connectors/elba/users/users';
import { decrypt } from '@/common/crypto';
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

  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.id, teamId),
    columns: { elbaOrganisationId: true, elbaRegion: true, adminId: true, token: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const elbaClient = createElbaClient(team.elbaOrganisationId, team.elbaRegion);

  if (user.id === team.adminId && !user.is_admin) {
    const token = await decrypt(team.token);
    await new SlackAPIClient().auth.revoke({ token });
    await db.delete(teamsTable).where(eq(teamsTable.id, teamId));
    await elbaClient.connectionStatus.update({ hasError: true });

    return { message: 'App uninstalled, user is not admin anymore', teamId, user };
  }

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
