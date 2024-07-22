import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { fetchDataProtectionObjectContent } from './service';

describe('fetch-data-protection-object-content', () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client', async (importOriginal) => ({
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- this is a mock
      ...(await importOriginal<typeof import('slack-web-api-client')>()),
    }));
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should successfully return message content', async () => {
    const messagesMock = {
      ok: true,
      headers: new Headers(),
      messages: [
        {
          ts: 'message-id',
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
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
      adminId: 'admin-id',
    });

    const result = await fetchDataProtectionObjectContent({
      organisationId: '00000000-0000-0000-0000-000000000001',
      metadata: {
        type: 'message',
        teamId: 'team-id',
        conversationId: 'channel-id',
        messageId: 'message-id',
      },
    });
    expect(result).toEqual('text');

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(historyMock).toBeCalledTimes(1);
    expect(historyMock).toBeCalledWith({
      channel: 'channel-id',
      inclusive: true,
      limit: 1,
      oldest: 'message-id',
    });

    expect(repliesMock).toBeCalledTimes(0);
  });

  it('Should successfully return thread reply content', async () => {
    const messagesMock = {
      ok: true,
      headers: new Headers(),
      messages: [
        {
          ts: 'message-id',
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

    const result = await fetchDataProtectionObjectContent({
      organisationId: '00000000-0000-0000-0000-000000000001',
      metadata: {
        type: 'reply',
        teamId: 'team-id',
        conversationId: 'channel-id',
        messageId: 'message-id',
      },
    });
    expect(result).toEqual('text');

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
      ts: 'message-id',
    });
  });

  it('Should successfully return empty body when rate limit is reached', async () => {
    const rateLimitError = new slack.SlackAPIError('unknown', 'ratelimited', {
      headers: new Headers(),
      ok: false,
    });
    const historyMock = vi.fn().mockRejectedValue(rateLimitError);
    const repliesMock = vi.fn().mockRejectedValue(rateLimitError);

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

    const result = await fetchDataProtectionObjectContent({
      organisationId: '00000000-0000-0000-0000-000000000001',
      metadata: {
        type: 'reply',
        teamId: 'team-id',
        conversationId: 'channel-id',
        messageId: 'message-id',
      },
    });
    expect(result).toEqual(null);

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
      ts: 'message-id',
    });
  });
});
