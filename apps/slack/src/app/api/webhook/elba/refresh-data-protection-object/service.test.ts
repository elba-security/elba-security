import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import { spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { conversationsTable, teamsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { refreshDataProtectionObject } from './service';

describe('refresh-data-protection-object', () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client', async (importOriginal) => {
      const mod: typeof slack = await importOriginal();
      return {
        ...mod,
        SlackAPIClient: vi.fn(),
      };
    });
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('message', () => {
    it('Should successfully refresh data protection object', async () => {
      const elba = spyOnElba();

      const messagesMock = {
        ok: true,
        headers: new Headers(),
        messages: [
          {
            type: 'message',
            team: 'team-id',
            ts: '1700000001.000000',
            user: 'user',
            text: 'text',
          },
        ],
      } satisfies
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.replies>>;
      const historyMock = vi.fn().mockResolvedValue(messagesMock);
      const repliesMock = vi.fn().mockResolvedValue(messagesMock);

      vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

      vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
        // @ts-expect-error -- this is a mock
        conversations: {
          history: historyMock,
          replies: repliesMock,
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
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      });

      await refreshDataProtectionObject({
        organisationId: '00000000-0000-0000-0000-000000000001',
        metadata: {
          type: 'message',
          teamId: 'team-id',
          conversationId: 'channel-id',
          messageId: '1700000001.000000',
        },
      });

      expect(crypto.decrypt).toBeCalledTimes(1);
      expect(crypto.decrypt).toBeCalledWith('token');

      expect(slack.SlackAPIClient).toBeCalledTimes(1);
      expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

      expect(historyMock).toBeCalledTimes(1);
      expect(historyMock).toBeCalledWith({
        channel: 'channel-id',
        inclusive: true,
        limit: 1,
        oldest: '1700000001.000000',
      });

      expect(repliesMock).toBeCalledTimes(0);

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
            id: '["team-id","channel-id","1700000001.000000"]',
            metadata: {
              conversationId: 'channel-id',
              messageId: '1700000001.000000',
              teamId: 'team-id',
              type: 'message',
            },
            name: '#channel - 2023-11-14',
            ownerId: 'user',
            permissions: [
              {
                id: 'domain',
                type: 'domain',
              },
            ],
            updatedAt: undefined,
            url: 'https://url/archives/channel-id/p1700000001000000',
          },
        ],
      });

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);
    });

    it("Should successfully delete data protection object if it doesn't exist anymore", async () => {
      const elba = spyOnElba();
      const messagesMock = {
        ok: true,
        headers: new Headers(),
        messages: [],
      } satisfies
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.replies>>;
      const historyMock = vi.fn().mockResolvedValue(messagesMock);
      const repliesMock = vi.fn().mockResolvedValue(messagesMock);

      vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

      vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
        // @ts-expect-error -- this is a mock
        conversations: {
          history: historyMock,
          replies: repliesMock,
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
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      });

      await refreshDataProtectionObject({
        organisationId: '00000000-0000-0000-0000-000000000001',
        metadata: {
          type: 'message',
          teamId: 'team-id',
          conversationId: 'channel-id',
          messageId: '1700000001.000000',
        },
      });

      expect(crypto.decrypt).toBeCalledTimes(1);
      expect(crypto.decrypt).toBeCalledWith('token');

      expect(slack.SlackAPIClient).toBeCalledTimes(1);
      expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

      expect(historyMock).toBeCalledTimes(1);
      expect(historyMock).toBeCalledWith({
        channel: 'channel-id',
        inclusive: true,
        limit: 1,
        oldest: '1700000001.000000',
      });

      expect(repliesMock).toBeCalledTimes(0);

      expect(elba).toBeCalledTimes(1);
      expect(elba).toBeCalledWith({
        apiKey: 'elba-api-key',
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      });

      const elbaInstance = elba.mock.results[0]?.value;
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
        ids: ['["team-id","channel-id","1700000001.000000"]'],
      });
    });
  });

  describe('reply', () => {
    it('Should successfully refresh data protection object', async () => {
      const elba = spyOnElba();
      const messagesMock = {
        ok: true,
        headers: new Headers(),
        messages: [
          {
            type: 'message',
            team: 'team-id',
            ts: '1700000001.000000',
            user: 'user',
            text: 'text',
            thread_ts: 'thread-id',
          },
        ],
      } satisfies
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>
        | Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.replies>>;
      const historyMock = vi.fn().mockResolvedValue(messagesMock);
      const repliesMock = vi.fn().mockResolvedValue(messagesMock);

      vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

      vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
        // @ts-expect-error -- this is a mock
        conversations: {
          history: historyMock,
          replies: repliesMock,
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
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      });

      await refreshDataProtectionObject({
        organisationId: '00000000-0000-0000-0000-000000000001',
        metadata: {
          type: 'reply',
          teamId: 'team-id',
          conversationId: 'channel-id',
          messageId: '1700000001.000000',
        },
      });

      expect(crypto.decrypt).toBeCalledTimes(1);
      expect(crypto.decrypt).toBeCalledWith('token');

      expect(slack.SlackAPIClient).toBeCalledTimes(1);
      expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

      expect(historyMock).toBeCalledTimes(0);

      expect(repliesMock).toBeCalledTimes(1);
      expect(repliesMock).toBeCalledWith({
        channel: 'channel-id',
        inclusive: true,
        limit: 1,
        ts: '1700000001.000000',
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
            id: '["team-id","channel-id","1700000001.000000"]',
            metadata: {
              conversationId: 'channel-id',
              messageId: '1700000001.000000',
              teamId: 'team-id',
              type: 'reply',
            },
            name: '#channel - 2023-11-14',
            ownerId: 'user',
            permissions: [
              {
                id: 'domain',
                type: 'domain',
              },
            ],
            updatedAt: undefined,
            url: 'https://url/archives/channel-id/p1700000001000000?thread_ts=thread-id&cid=channel-id',
          },
        ],
      });

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);
    });

    it("Should successfully delete data protection object if it doesn't exist anymore", async () => {
      const elba = spyOnElba();
      const slackErrorResponse = {
        ok: false,
        headers: new Headers(),
        error: 'thread_not_found',
      } satisfies slack.SlackAPIResponse;
      const slackError = new slack.SlackAPIError(
        'api',
        slackErrorResponse.error,
        slackErrorResponse
      );

      const historyMock = vi.fn().mockRejectedValue(slackError);
      const repliesMock = vi.fn().mockRejectedValue(slackError);

      vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

      vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
        // @ts-expect-error -- this is a mock
        conversations: {
          history: historyMock,
          replies: repliesMock,
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
        id: 'channel-id',
        isSharedExternally: false,
        lastSyncedAt: new Date('2024-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'team-id',
      });

      await refreshDataProtectionObject({
        organisationId: '00000000-0000-0000-0000-000000000001',
        metadata: {
          type: 'reply',
          teamId: 'team-id',
          conversationId: 'channel-id',
          messageId: '1700000001.000000',
        },
      });

      expect(crypto.decrypt).toBeCalledTimes(1);
      expect(crypto.decrypt).toBeCalledWith('token');

      expect(slack.SlackAPIClient).toBeCalledTimes(1);
      expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

      expect(historyMock).toBeCalledTimes(0);

      expect(repliesMock).toBeCalledTimes(1);
      expect(repliesMock).toBeCalledWith({
        channel: 'channel-id',
        inclusive: true,
        limit: 1,
        ts: '1700000001.000000',
      });

      expect(elba).toBeCalledTimes(1);
      expect(elba).toBeCalledWith({
        apiKey: 'elba-api-key',
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      });

      const elbaInstance = elba.mock.results[0]?.value;
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
        ids: ['["team-id","channel-id","1700000001.000000"]'],
      });
    });
  });
});
