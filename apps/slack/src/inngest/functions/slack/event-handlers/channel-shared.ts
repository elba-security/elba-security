import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { conversationsTable, teamsTable } from '@/database/schema';
import { db } from '@/database/client';
import { env } from '@/common/env';
import { decrypt } from '@/common/crypto';
import type { SlackEventHandler } from './types';

export const channelSharedHandler: SlackEventHandler<'channel_shared'> = async (
  { event: { channel: channelId }, event_context: eventContext },
  { step, logger }
) => {
  const { authorizations } = await new SlackAPIClient(
    env.SLACK_APP_LEVEL_TOKEN
  ).apps.event.authorizations.list({
    event_context: eventContext as string,
  });

  if (!authorizations) {
    throw new Error('Failed to retrieve authorizations');
  }

  const steps: Promise<{ organisationId: string; teamId: string; isSyncRequired: boolean }>[] = [];
  for (const { team_id: teamId } of authorizations) {
    if (!teamId) {
      logger.error('No team id provided in authorization');
      continue;
    }

    steps.push(
      step.run(`channel-shared-${teamId}`, async () => {
        const [conversation, team] = await Promise.all([
          db.query.conversationsTable.findFirst({
            where: and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, channelId)),
            columns: {
              isSharedExternally: true,
            },
          }),
          await db.query.teamsTable.findFirst({
            where: eq(teamsTable.id, teamId),
            columns: {
              token: true,
              elbaOrganisationId: true,
            },
          }),
        ]);

        if (!team) {
          throw new Error('Failed to find team');
        }

        // When accepting a slack connect invitation, no 'channel_created' event is sent
        // We have to handle the channel creation here
        if (!conversation) {
          const decryptedToken = await decrypt(team.token);
          const slackClient = new SlackAPIClient(decryptedToken);
          const slackConversation = await slackClient.conversations.info({
            channel: channelId,
          });

          const conversationName = slackConversation.channel?.name;

          if (!conversationName) {
            throw new Error('Failed to retrieve conversation information');
          }

          await db.insert(conversationsTable).values({
            id: channelId,
            isSharedExternally: true,
            lastSyncedAt: new Date(),
            name: conversationName,
            teamId,
          });

          return { organisationId: team.elbaOrganisationId, teamId, isSyncRequired: true };
        }

        // In case the channel was not shared externally yet, we need to trigger a sync
        // to update the permissions
        if (!conversation.isSharedExternally) {
          await db
            .update(conversationsTable)
            .set({
              isSharedExternally: true,
              lastSyncedAt: new Date(),
            })
            .where(
              and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, channelId))
            );

          return { organisationId: team.elbaOrganisationId, teamId, isSyncRequired: true };
        }

        return { organisationId: team.elbaOrganisationId, teamId, isSyncRequired: false };
      })
    );
  }

  const stepResults = await Promise.all(steps);
  const teamsToSync = stepResults.filter(({ isSyncRequired }) => isSyncRequired);

  if (teamsToSync.length) {
    await step.sendEvent(
      'sync-channels',
      teamsToSync.map(({ teamId, organisationId }) => ({
        name: 'slack/conversations.sync.messages.requested',
        data: {
          organisationId,
          teamId,
          conversationId: channelId,
          isFirstSync: false,
        },
      }))
    );
  }

  return { message: 'Channel shared', channelId, authorizations };
};
