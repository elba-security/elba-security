import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshData } from '@/app/api/webhooks/elba/data-protection/refresh-object/service';
import { encrypt } from '@/common/crypto';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';

const encryptedToken = await encrypt('token');

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const messageData: ElbaPayload = {
  id: 'message-id',
  metadata: {
    teamId: 'team-id',
    organisationId: organisation.id,
    channelId: 'channel-id',
    messageId: 'message-id',
    replyId: undefined,
    type: 'message',
  },
  organisationId: organisation.id,
};

const replyData: ElbaPayload = {
  id: 'reply-id',
  metadata: {
    teamId: 'team-id',
    organisationId: organisation.id,
    channelId: 'channel-id',
    messageId: 'message-id',
    replyId: 'reply-id',
    type: 'reply',
  },
  organisationId: organisation.id,
};

describe('refreshData', () => {
  test('should refresh message data object', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(refreshData(messageData)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'teams/teams.sync.triggered',
      data: {
        organisationId: messageData.organisationId,
        syncStartedAt: new Date().toISOString(),
        skipToken: null,
      },
    });
  });

  test('should refresh reply data object', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(refreshData(replyData)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'teams/teams.sync.triggered',
      data: {
        organisationId: replyData.organisationId,
        syncStartedAt: new Date().toISOString(),
        skipToken: null,
      },
    });
  });
});
