import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import * as channelConnector from '@/connectors/microsoft/channels/channels';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { encrypt, decrypt } from '@/common/crypto';
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
const organisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a9e8';

const organisations = [
  {
    id: organisationId,
    tenantId: 'tenant-id',
    region: 'us',
    token: encryptedToken,
  },
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e7',
    tenantId: 'tenant-id',
    region: 'us',
    token: encryptedToken,
  },
];

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

  test('should not insert the channel if the channel is private', async () => {
    await db.insert(organisationsTable).values(organisations);

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

    await expect(result).resolves.toStrictEqual('Ignore private or invalid channel');

    expect(getChannel).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'private-channel-id',
    });
    expect(getChannel).toBeCalledTimes(1);
  });

  test('should insert a channel in db', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.ChannelCreated,
      },
    });

    const getChannel = vi.spyOn(channelConnector, 'getChannel').mockResolvedValue({
      id: 'channel-id',
      displayName: 'channel',
      membershipType: 'standard',
      webUrl: 'web-url',
    });

    await expect(result).resolves.toBe('The channel is saved in the database.');

    expect(getChannel).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'channel-id',
    });
    expect(getChannel).toBeCalledTimes(1);

    await expect(
      db
        .select({ id: channelsTable.id, organisationId: channelsTable.organisationId })
        .from(channelsTable)
        .where(eq(channelsTable.id, 'channel-id'))
    ).resolves.toStrictEqual(
      organisations.map((org) => ({ id: 'channel-id', organisationId: org.id }))
    );

    expect(step.sendEvent).toBeCalledWith('request-to-create-subscription', {
      name: 'teams/channel.subscription.requested',
      data: {
        tenantId: 'tenant-id',
        organisationId,
        channelId: 'channel-id',
        teamId: 'team-id',
      },
    });
    expect(step.sendEvent).toBeCalledTimes(1);
  });
});
