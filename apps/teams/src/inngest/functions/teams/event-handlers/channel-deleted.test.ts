import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { channelsTable, organisationsTable, subscriptionsTable } from '@/database/schema';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { inngest } from '@/inngest/client';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const channel = {
  id: `${organisation.id}:channel-id`,
  membershipType: 'standard',
  displayName: 'channel-name',
  organisationId: organisation.id,
  channelId: 'channel-id',
};

const subscription = {
  id: 'subscription-id',
  resource: "teams('team-id')/channels('channel-id')",
  organisationId: organisation.id,
  changeType: 'create',
};

const now = new Date().toISOString();
describe('channel-deleted', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  test('should throw when the organisation is not registered', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        event: EventType.ChannelDeleted,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should throw when the channel not received', async () => {
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        event: EventType.ChannelDeleted,
      },
    });

    await expect(
      db
        .select({ id: channelsTable.id })
        .from(channelsTable)
        .where(eq(channelsTable.id, 'channel-id'))
    ).resolves.toMatchObject([]);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should delete the channel, subscription and messages', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);
    await db.insert(subscriptionsTable).values(subscription);

    const deleteSubscription = vi
      .spyOn(subscriptionConnector, 'deleteSubscription')
      // @ts-expect-error -- this is a mock
      .mockResolvedValue(undefined);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        event: EventType.ChannelDeleted,
      },
    });

    await expect(result).resolves.toStrictEqual({ message: 'channel was deleted' });

    expect(deleteSubscription).toBeCalledWith(organisation.token, subscription.id);
    expect(deleteSubscription).toBeCalledTimes(1);

    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, subscription.id));

    await db.delete(channelsTable).where(eq(channelsTable.id, `${organisation.id}:channel-id`));

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'teams/teams.sync.requested',
      data: {
        organisationId: organisation.id,
        syncStartedAt: now,
        skipToken: null,
        isFirstSync: true,
      },
    });
  });
});
