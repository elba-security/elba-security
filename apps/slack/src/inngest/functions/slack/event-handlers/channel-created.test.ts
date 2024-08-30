import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

const eventType: SlackEvent['type'] = 'channel_created';

describe.skip(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should insert channel successfully', async () => {
    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        event: {
          type: eventType,
          // @ts-expect-error -- this is a partial mock
          channel: {
            id: 'channel-id-1',
            name: 'channel',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id-1',
      channelName: 'channel',
      message: 'Channel created',
      teamId: 'team-id',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();

    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel',
        teamId: 'team-id',
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
