import { describe, expect, test, vi } from 'vitest';
import { deleteDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/delete-object/service';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import { inngest } from '@/inngest/client';

const organisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a9e8';

const metadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: undefined,
  type: 'message',
};

describe('deleteDataProtectionObject', () => {
  test('should throw is the metadata is invalid', async () => {
    await expect(
      deleteDataProtectionObject({ organisationId, metadata: null })
    ).rejects.toThrowError();
  });

  test('should refresh if the metadata is valid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(deleteDataProtectionObject({ organisationId, metadata })).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'teams/data.protection.delete.triggered',
      data: {
        organisationId,
        metadata,
      },
    });
  });
});
