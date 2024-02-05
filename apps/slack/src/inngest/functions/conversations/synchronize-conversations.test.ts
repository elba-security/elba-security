import { expect, test, describe, vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { conversationsTable, teamsTable } from '@/database/schema';
import { synchronizeConversations } from './synchronize-conversations';

const setup = createInngestFunctionMock(
  synchronizeConversations,
  'slack/conversations.sync.requested'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('synchronize-conversations', () => {
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

  test('should properly synchronize conversations and handle pagination', async () => {
    const elba = spyOnElba();

    const listMock = vi.fn().mockResolvedValue({
      ok: true,
      channels: [
        {
          id: 'channel-id-1',
          name: 'channel1',
          is_ext_shared: true,
        },
        {
          id: 'channel-id-2',
          name: 'channel2',
          is_ext_shared: false,
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.list>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        list: listMock,
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
      id: 'channel-id-1', // This conversation should be updated
      isSharedExternally: false,
      lastSyncedAt: new Date('2000-01-01T00:00:00.000Z'),
      name: 'old name',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      isFirstSync: true,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toStrictEqual({
      conversationsToInsert: [
        {
          id: 'channel-id-1',
          isSharedExternally: true,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel1',
          teamId: 'team-id',
        },
        {
          id: 'channel-id-2',
          isSharedExternally: false,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel2',
          teamId: 'team-id',
        },
      ],
      nextCursor: 'next-cursor',
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(listMock).toBeCalledTimes(1);
    expect(listMock).toBeCalledWith({
      exclude_archived: true,
      limit: 200,
      types: 'public_channel',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();
    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id-1',
        isSharedExternally: true,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel1',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel2',
        teamId: 'team-id',
      },
    ]);

    expect(elba).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-1', {
      event: 'slack/conversations.sync.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-1'",
      timeout: '1 day',
    });
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-2', {
      event: 'slack/conversations.sync.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-2'",
      timeout: '1 day',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversations-messages-synchronization', [
      {
        data: {
          conversationId: 'channel-id-1',
          isFirstSync: true,
          teamId: 'team-id',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
      {
        data: {
          conversationId: 'channel-id-2',
          isFirstSync: true,
          teamId: 'team-id',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        cursor: 'next-cursor',
        isFirstSync: true,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.requested',
    });
  });

  test('should properly synchronize conversations and end when pagination is over', async () => {
    const elba = spyOnElba();

    const listMock = vi.fn().mockResolvedValue({
      ok: true,
      channels: [
        {
          id: 'channel-id-1',
          name: 'channel1',
          is_ext_shared: true,
        },
        {
          id: 'channel-id-2',
          name: 'channel2',
          is_ext_shared: false,
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.list>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        list: listMock,
      },
    });

    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token-1',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'unknown-team-id',
        token: 'token-2',
        url: 'https://url',
      },
    ]);

    await db.insert(conversationsTable).values([
      {
        // This conversation should be delete
        id: 'conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'team-id',
      },
      {
        // This conversation shouldn't be deleted as it's part of another team
        id: 'unknown-conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'unknown-team-id',
      },
    ]);

    const [result, { step }] = setup({
      teamId: 'team-id',
      isFirstSync: false,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      conversationsToInsert: [
        {
          id: 'channel-id-1',
          isSharedExternally: true,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel1',
          teamId: 'team-id',
        },
        {
          id: 'channel-id-2',
          isSharedExternally: false,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel2',
          teamId: 'team-id',
        },
      ],
      nextCursor: undefined,
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token-1');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(listMock).toBeCalledTimes(1);
    expect(listMock).toBeCalledWith({
      cursor: 'cursor',
      exclude_archived: true,
      limit: 200,
      types: 'public_channel',
    });

    const conversationsInserted = await db.query.conversationsTable.findMany();
    expect(conversationsInserted).toEqual([
      {
        id: 'unknown-conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'unknown-team-id',
      },
      {
        id: 'channel-id-1',
        isSharedExternally: true,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel1',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel2',
        teamId: 'team-id',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: '2023-01-01T00:00:00.000Z',
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-1', {
      event: 'slack/conversations.sync.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-1'",
      timeout: '1 day',
    });
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-2', {
      event: 'slack/conversations.sync.messages.completed',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-2'",
      timeout: '1 day',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-conversations-messages-synchronization', [
      {
        data: {
          conversationId: 'channel-id-1',
          isFirstSync: false,
          teamId: 'team-id',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
      {
        data: {
          conversationId: 'channel-id-2',
          isFirstSync: false,
          teamId: 'team-id',
        },
        name: 'slack/conversations.sync.messages.requested',
      },
    ]);
  });
});
