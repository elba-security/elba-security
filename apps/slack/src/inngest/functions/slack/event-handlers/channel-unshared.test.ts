import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { conversationsTable, teamsTable } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

const eventType: SlackEvent['type'] = 'channel_unshared';

describe.skip(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('Should successfully update and synchronize conversation', async () => {
    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'another-team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    await db.insert(conversationsTable).values([
      {
        id: 'channel-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      },
      {
        id: 'channel-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
    ]);

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        // @ts-expect-error -- this is a mock
        event: {
          type: eventType,
          channel: 'channel-id',
          is_ext_shared: false,
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      isSharedExternally: false,
      message: 'Channel unshared',
      teamId: 'team-id',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();
    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
      {
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-conversation-messages', {
      data: {
        conversationId: 'channel-id',
        isFirstSync: false,
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.messages.requested',
    });
  });
});
