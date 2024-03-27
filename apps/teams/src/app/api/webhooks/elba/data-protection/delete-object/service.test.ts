import { describe, expect, test, vi } from 'vitest';
import { decrypt, encrypt } from '@/common/crypto';
import { deleteDataProtectionObject } from '@/app/api/webhooks/elba/data-protection/delete-object/service';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as replyConnector from '@/connectors/microsoft/replies/replies';

const token = 'token';
const encryptedToken = await encrypt(token);

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
describe('deleteDataProtectionObject', () => {
  test('should throw if the organization not received', async () => {
    await expect(deleteDataProtectionObject(messageData)).rejects.toThrowError();
  });

  test('should delete message object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteMessage = vi
      .spyOn(messageConnector, 'deleteMessage')
      .mockResolvedValue({ message: 'message was deleted' });

    await expect(deleteDataProtectionObject(messageData)).resolves.toBeUndefined();

    expect(deleteMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageData.metadata.organisationId,
      channelId: messageData.metadata.channelId,
      messageId: messageData.metadata.messageId,
    });
    expect(deleteMessage).toBeCalledTimes(1);
  });

  test('should delete reply object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteReply = vi
      .spyOn(replyConnector, 'deleteReply')
      .mockResolvedValue({ message: 'reply was deleted' });

    await expect(deleteDataProtectionObject(replyData)).resolves.toBeUndefined();

    expect(deleteReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyData.metadata.organisationId,
      channelId: replyData.metadata.channelId,
      messageId: replyData.metadata.messageId,
      replyId: replyData.metadata.replyId,
    });
    expect(deleteReply).toBeCalledTimes(1);
  });
});
