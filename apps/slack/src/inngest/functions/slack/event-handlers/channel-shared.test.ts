import { expect, test, describe, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as slack from 'slack-web-api-client';
import { db } from '@/database/client';
import { conversationsTable, teamsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

const eventType: SlackEvent['type'] = 'channel_shared';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Should successfully update and synchronize conversation when needed', async () => {
    const authListMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      authorizations: [
        {
          team_id: 'team-id-1',
        },
        {
          team_id: 'team-id-2',
        },
        {
          team_id: 'team-id-3',
        },
      ],
    } satisfies Awaited<
      ReturnType<typeof slack.SlackAPIClient.prototype.apps.event.authorizations.list>
    >);

    const conversationsInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      channel: {
        name: 'conversation',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.info>>);

    vi.spyOn(crypto, 'decrypt').mockImplementation((token) =>
      Promise.resolve(`decrypted-${token}`)
    );

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      apps: {
        event: {
          authorizations: {
            list: authListMock,
          },
        },
      },
      // @ts-expect-error -- this is a mock
      conversations: {
        info: conversationsInfoMock,
      },
    });

    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id-1',
        token: 'token-1',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'team-id-2',
        token: 'token-2',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-3',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000003',
        elbaRegion: 'eu',
        id: 'team-id-3',
        token: 'token-3',
        url: 'https://url',
      },
    ]);

    await db.insert(conversationsTable).values([
      {
        id: 'channel-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id-1',
      },
      {
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id-2',
      },
    ]);

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        // @ts-expect-error -- this is a mock
        event: {
          type: eventType,
          channel: 'channel-id',
        },
        event_context: 'event-context',
      },
    });

    await expect(result).resolves.toStrictEqual({
      authorizations: [
        {
          team_id: 'team-id-1',
        },
        {
          team_id: 'team-id-2',
        },
        {
          team_id: 'team-id-3',
        },
      ],
      channelId: 'channel-id',
      message: 'Channel shared',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();
    expect(conversationsInserted).toEqual(
      expect.arrayContaining([
        {
          id: 'channel-id',
          isSharedExternally: true,
          lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
          name: 'channel',
          teamId: 'team-id-1',
        },
        {
          id: 'channel-id',
          isSharedExternally: true,
          lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
          name: 'channel',
          teamId: 'team-id-2',
        },
        {
          id: 'channel-id',
          isSharedExternally: true,
          lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
          name: 'conversation',
          teamId: 'team-id-3',
        },
      ])
    );

    expect(slack.SlackAPIClient).toBeCalledTimes(2);
    expect(slack.SlackAPIClient).toBeCalledWith('slack-app-level-token');

    expect(authListMock).toBeCalledTimes(1);
    expect(authListMock).toBeCalledWith({ event_context: 'event-context' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token-3');

    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token-3');

    expect(conversationsInfoMock).toBeCalledTimes(1);
    expect(conversationsInfoMock).toBeCalledWith({ channel: 'channel-id' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-channels', [
      {
        data: {
          conversationId: 'channel-id',
          isFirstSync: false,
          teamId: 'team-id-2',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
      {
        data: {
          conversationId: 'channel-id',
          isFirstSync: false,
          teamId: 'team-id-3',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
    ]);
  });
});
