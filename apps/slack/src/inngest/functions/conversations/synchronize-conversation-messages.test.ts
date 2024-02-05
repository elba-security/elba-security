import { expect, test, describe, vi, afterEach, afterAll, beforeAll } from 'vitest';
import * as slack from 'slack-web-api-client';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { conversationsTable, teamsTable } from '@/database/schema';
import { synchronizeConversationMessages } from './synchronize-conversation-messages';

const setup = createInngestFunctionMock(
  synchronizeConversationMessages,
  'slack/conversations.sync.messages.requested'
);

describe('synchronize-conversation-messages', () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.resetModules();
  });

  test('should properly synchronize messages and handle pagination', async () => {
    const elba = spyOnElba();

    const historyMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
          thread_ts: 'thread-id',
        },
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000002.000000',
          user: 'user',
          edited: {
            ts: '1700000003.000000',
          },
          text: 'text2',
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        history: historyMock,
      },
    });

    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });
    await db.insert(conversationsTable).values({
      id: 'conversation-id',
      isSharedExternally: false,
      lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
      name: 'conversation',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      conversationId: 'conversation-id',
      isFirstSync: true,
    });

    await expect(result).resolves.toStrictEqual({
      objects: 2,
      nextCursor: 'next-cursor',
      threadIds: ['thread-id'],
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(historyMock).toBeCalledTimes(1);
    expect(historyMock).toBeCalledWith({
      channel: 'conversation-id',
      limit: 200,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: '["team-id","conversation-id","1700000001.000000"]',
          metadata: {
            conversationId: 'conversation-id',
            messageId: '1700000001.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: '#conversation - 2023-11-14',
          ownerId: 'user',
          permissions: [
            {
              id: 'domain',
              type: 'domain',
            },
          ],
          updatedAt: undefined,
          url: 'https://url/archives/conversation-id/p1700000001000000',
        },
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            conversationId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: '#conversation - 2023-11-14',
          ownerId: 'user',
          permissions: [
            {
              id: 'domain',
              type: 'domain',
            },
          ],
          updatedAt: '2023-11-14T22:13:23.000Z',
          url: 'https://url/archives/conversation-id/p1700000002000000',
        },
      ],
    });

    expect(step.waitForEvent).toBeCalledTimes(1);
    expect(step.waitForEvent).toBeCalledWith('wait-for-thread-message-sync-complete-thread-id', {
      event: 'slack/conversations.sync.thread.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'conversation-id' && async.data.threadId == 'thread-id'",
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversation-thread-messages-synchronization', [
      {
        data: {
          conversationId: 'conversation-id',
          isFirstSync: true,
          teamId: 'team-id',
          threadId: 'thread-id',
        },
        name: 'slack/conversations.sync.thread.messages.requested',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        conversationId: 'conversation-id',
        cursor: 'next-cursor',
        isFirstSync: true,
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.messages.requested',
    });
  });

  test('should properly synchronize messages and end when pagination is over', async () => {
    const elba = spyOnElba();

    const historyMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
          thread_ts: 'thread-id',
        },
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000002.000000',
          user: 'user',
          edited: {
            ts: '1700000003.000000',
          },
          text: 'text2',
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        history: historyMock,
      },
    });

    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });
    await db.insert(conversationsTable).values({
      id: 'conversation-id',
      isSharedExternally: false,
      lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
      name: 'conversation',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      conversationId: 'conversation-id',
      isFirstSync: false,
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      objects: 2,
      nextCursor: undefined,
      threadIds: ['thread-id'],
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(historyMock).toBeCalledTimes(1);
    expect(historyMock).toBeCalledWith({
      channel: 'conversation-id',
      limit: 200,
      cursor: 'cursor',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: '["team-id","conversation-id","1700000001.000000"]',
          metadata: {
            conversationId: 'conversation-id',
            messageId: '1700000001.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: '#conversation - 2023-11-14',
          ownerId: 'user',
          permissions: [
            {
              id: 'domain',
              type: 'domain',
            },
          ],
          updatedAt: undefined,
          url: 'https://url/archives/conversation-id/p1700000001000000',
        },
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            conversationId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: '#conversation - 2023-11-14',
          ownerId: 'user',
          permissions: [
            {
              id: 'domain',
              type: 'domain',
            },
          ],
          updatedAt: '2023-11-14T22:13:23.000Z',
          url: 'https://url/archives/conversation-id/p1700000002000000',
        },
      ],
    });

    expect(step.waitForEvent).toBeCalledTimes(1);
    expect(step.waitForEvent).toBeCalledWith('wait-for-thread-message-sync-complete-thread-id', {
      event: 'slack/conversations.sync.thread.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'conversation-id' && async.data.threadId == 'thread-id'",
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversation-thread-messages-synchronization', [
      {
        data: {
          conversationId: 'conversation-id',
          isFirstSync: false,
          teamId: 'team-id',
          threadId: 'thread-id',
        },
        name: 'slack/conversations.sync.thread.messages.requested',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('conversation-sync-complete', {
      data: {
        conversationId: 'conversation-id',
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.messages.completed',
    });
  });
});
