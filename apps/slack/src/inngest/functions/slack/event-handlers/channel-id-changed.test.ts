import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
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

const eventType: SlackEvent['type'] = 'channel_id_changed';

// Skip as it's not necessary for now, it will for future iteration when we support private channels
describe.skip(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should update channel successfully', async () => {
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
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 1',
        teamId: 'team-id',
      },
      {
        // Should not be updated as it doesn't match the same id
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 2',
        teamId: 'team-id',
      },
      {
        // Should not be updated as it doesn't match the same team id
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
    ]);

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        // @ts-expect-error -- this is a partial mock
        event: {
          type: eventType,
          old_channel_id: 'channel-id-1',
          new_channel_id: 'new-channel-id-1',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Channel id changed',
      newChannelId: 'new-channel-id-1',
      oldChannelId: 'channel-id-1',
      teamId: 'team-id',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();

    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 2',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
      {
        id: 'new-channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 1',
        teamId: 'team-id',
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-conversations', {
      data: {
        isFirstSync: false,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.requested',
    });
  });
});
