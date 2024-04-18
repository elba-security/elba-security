import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/refresh-object/service';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';

const organisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a9e8';

const metadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: undefined,
  type: 'message',
};

describe('refreshDataProtectionObject', () => {
  test('should throw is the metadata is invalid', async () => {
    await expect(
      refreshDataProtectionObject({ organisationId, metadata: null })
    ).rejects.toThrowError();
  });

  test('should refresh if the metadata is valid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(
      refreshDataProtectionObject({ organisationId, metadata })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'teams/data_protection.refresh_object.requested',
      data: {
        organisationId,
        metadata,
      },
    });
  });
});
