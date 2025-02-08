import { sql } from 'drizzle-orm';
import { db } from '@/database/client';
import { channelsTable } from '@/database/schema';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { decrypt } from '@/common/crypto';
import { getChannel } from '@/connectors/microsoft/channels/channels';

export const channelCreatedHandler: TeamsEventHandler = async (
  { channelId, teamId, tenantId, organisations, token, organisationId },
  { step }
) => {
  const channel = await step.run('fetch-channel-from-microsoft', async () =>
    getChannel({
      token: await decrypt(token),
      teamId,
      channelId,
    })
  );

  if (!channel || channel.membershipType === 'private') {
    return 'Ignore private or invalid channel';
  }

  await step.run('upsert-channels-to-db', async () => {
    await db
      .insert(channelsTable)
      .values(
        organisations.map((organisation) => ({
          id: channelId,
          organisationId: organisation.id,
          membershipType: channel.membershipType,
          displayName: channel.displayName,
        }))
      )
      .onConflictDoUpdate({
        target: [channelsTable.id, channelsTable.organisationId],
        set: {
          displayName: sql`excluded.display_name`,
        },
      });
  });

  await step.sendEvent('request-to-create-subscription', {
    name: 'teams/channel.subscription.requested',
    data: {
      tenantId,
      organisationId,
      channelId: channel.id,
      teamId,
    },
  });

  return 'The channel is saved in the database.';
};
