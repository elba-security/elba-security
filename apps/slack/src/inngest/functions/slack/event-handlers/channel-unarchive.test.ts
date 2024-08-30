import { expect, test, describe, beforeAll, afterAll, vi, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

const eventType: SlackEvent['type'] = 'channel_unarchive';

describe.skip(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should insert channel successfully', async () => {
    const conversationInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      channel: {
        id: 'channel-id-1',
        name: 'channel',
        is_ext_shared: false,
      },
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.info>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a partial mock
      conversations: {
        info: conversationInfoMock,
      },
    });

    await db.insert(teamsTable).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
      adminId: 'admin-id',
    });

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        // @ts-expect-error -- this is a partial mock
        event: {
          type: eventType,
          channel: 'channel-id-1',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id-1',
      message: 'Channel unarchived',
      teamId: 'team-id',
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(conversationInfoMock).toBeCalledTimes(1);
    expect(conversationInfoMock).toBeCalledWith({
      channel: 'channel-id-1',
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

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-conversation-messages', {
      data: {
        conversationId: 'channel-id-1',
        isFirstSync: false,
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.messages.requested',
    });
  });
});
