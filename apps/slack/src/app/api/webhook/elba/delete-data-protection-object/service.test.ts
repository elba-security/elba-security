import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { deleteDataProtectionObject } from './service';

describe('delete-data-protection-object', () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should successfully delete slack message', async () => {
    const deleteMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.chat.delete>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      chat: {
        delete: deleteMock,
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

    await deleteDataProtectionObject({
      organisationId: '00000000-0000-0000-0000-000000000001',
      metadata: {
        type: 'message',
        teamId: 'team-id',
        conversationId: 'channel-id',
        messageId: 'message-id',
      },
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(deleteMock).toBeCalledTimes(1);
    expect(deleteMock).toBeCalledWith({
      as_user: true,
      channel: 'channel-id',
      ts: 'message-id',
    });
  });
});
