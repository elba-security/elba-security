import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import * as channelConnector from '@/connectors/microsoft/channels/channels';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { encrypt, decrypt } from '@/common/crypto';
import { inngest } from '@/inngest/client';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import type { MicrosoftChannel } from '@/connectors/microsoft/channels/channels';

const privateChannel: MicrosoftChannel = {
  id: 'private-channel-id',
  membershipType: 'private',
  displayName: 'private',
  webUrl: 'web-url',
};

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

describe('channel-created', () => {
  test('should throw when the organisation is not registered', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.ChannelCreated,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should not insert the channel when the channel is exist', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values({
      id: `${organisation.id}:exist-channel-id`,
      channelId: 'exist-channel-id',
      organisationId: organisation.id,
      membershipType: 'standard',
      displayName: 'exist-channel',
    });

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'exist-channel-id',
        tenantId: 'tenant-id',
        event: EventType.ChannelCreated,
      },
    });

    await expect(
      db
        .select({ id: channelsTable.id })
        .from(channelsTable)
        .where(eq(channelsTable.id, `${organisation.id}:exist-channel-id`))
    ).resolves.toMatchObject([{ id: `${organisation.id}:exist-channel-id` }]);

    await expect(result).resolves.toStrictEqual({
      message: 'channel already exists',
    });
  });

  test('should not insert the channel if the channel is private', async () => {
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'private-channel-id',
        tenantId: 'tenant-id',
        event: EventType.ChannelCreated,
      },
    });

    const getChannel = vi.spyOn(channelConnector, 'getChannel').mockResolvedValue(privateChannel);

    await expect(result).resolves.toStrictEqual({ message: 'Ignore private or invalid channel' });

    expect(getChannel).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'private-channel-id',
    });
    expect(getChannel).toBeCalledTimes(1);
  });

  test('should insert a channel in db', async () => {
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.ChannelCreated,
      },
    });

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const getChannel = vi.spyOn(channelConnector, 'getChannel').mockResolvedValue({
      id: 'channel-id',
      displayName: 'channel',
      membershipType: 'standard',
      webUrl: 'web-url',
    });

    await expect(result).resolves.toStrictEqual({ message: 'Channel created' });

    expect(getChannel).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'channel-id',
    });
    expect(getChannel).toBeCalledTimes(1);

    expect(send).toBeCalledWith({
      name: 'teams/channel.subscription.requested',
      data: {
        uniqueChannelInOrganisationId: `${organisation.id}:channel-id`,
        organisationId: organisation.id,
        channelId: 'channel-id',
        teamId: 'team-id',
      },
    });
    expect(send).toBeCalledTimes(1);
  });
});
