import { eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import type { User } from '@elba-security/sdk';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { slackMemberSchema } from '@/connectors/slack/members';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';
import { formatUser } from '@/connectors/elba/users/users';
import { env } from '@/common/env';

export type SynchronizeUsersEvents = {
  'slack/users.sync.requested': SynchronizeUsers;
};

type SynchronizeUsers = {
  data: {
    teamId: string;
    syncStartedAt: string;
    isFirstSync: boolean;
    cursor?: string;
  };
};

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'slack-synchronize-users',
    retries: 5,
    concurrency: {
      limit: 1,
      key: 'event.data.teamId + "-" + event.data.isFirstSync',
    },
  },
  { event: 'slack/users.sync.requested' },
  async ({
    event: {
      data: { teamId, syncStartedAt, isFirstSync, cursor },
    },
    step,
  }) => {
    const { elbaOrganisationId, elbaRegion, token } = await step.run('get-team', async () => {
      const result = await db.query.teamsTable.findFirst({
        where: eq(teamsTable.id, teamId),
        columns: { token: true, elbaOrganisationId: true, elbaRegion: true },
      });

      if (!result) {
        throw new Error('Failed to find team');
      }

      return {
        token: result.token,
        elbaOrganisationId: result.elbaOrganisationId,
        elbaRegion: result.elbaRegion,
      };
    });

    const { members, nextCursor } = await step.run('listing-users', async () => {
      const decryptedToken = await decrypt(token);
      const slackClient = new SlackAPIClient(decryptedToken);
      const { members: responseMember, response_metadata: responseMetadata } =
        await slackClient.users.list({
          limit: env.SLACK_USERS_LIST_BATCH_SIZE,
          cursor: cursor || undefined,
        });
      if (!responseMember) {
        throw new Error('An error occurred while listing slack users');
      }

      return { members: responseMember, nextCursor: responseMetadata?.next_cursor };
    });

    const users: User[] = [];
    for (const member of members) {
      const result = slackMemberSchema.safeParse(member);
      if (member.team_id === teamId && !member.deleted && !member.is_bot && result.success) {
        const user = formatUser(result.data);
        users.push(user);
      }
    }

    const elbaClient = createElbaClient(elbaOrganisationId, elbaRegion);
    await step.run('update-users', async () => {
      await elbaClient.users.update({ users });
    });

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'slack/users.sync.requested',
        data: {
          teamId,
          syncStartedAt,
          isFirstSync,
          cursor: nextCursor,
        },
      });
    } else {
      await step.run('delete-users', async () => {
        await elbaClient.users.delete({ syncedBefore: syncStartedAt });
      });
    }

    return { users, nextCursor };
  }
);
