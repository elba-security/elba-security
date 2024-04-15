import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { deleteDataProtection } from '@/inngest/functions/data-protections/delete-data-protection';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import { decrypt, encrypt } from '@/common/crypto';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';

const setup = createInngestFunctionMock(
  deleteDataProtection,
  'teams/data.protection.delete.triggered'
);

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const messageMetadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId: organisation.id,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: undefined,
  type: 'message',
};

const replyMetadata: MessageMetadata = {
  teamId: 'team-id',
  organisationId: organisation.id,
  channelId: 'channel-id',
  messageId: 'message-id',
  replyId: 'reply-id',
  type: 'reply',
};

describe('deleteDataProtection', () => {
  test('should throw if the organisation is not found', async () => {
    // @ts-expect-error this is a mock
    const [result] = setup(null);
    await expect(result).rejects.toThrowError();
  });

  test('should delete message object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteMessage = vi
      .spyOn(messageConnector, 'deleteMessage')
      .mockResolvedValue({ message: 'message was deleted' });

    const [result] = setup({ organisationId: organisation.id, metadata: messageMetadata });
    await expect(result).resolves.toBeUndefined();

    expect(deleteMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(deleteMessage).toBeCalledTimes(1);
  });

  test('should delete reply object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const deleteReply = vi
      .spyOn(replyConnector, 'deleteReply')
      .mockResolvedValue({ message: 'reply was deleted' });

    const [result] = setup({ organisationId: organisation.id, metadata: replyMetadata });
    await expect(result).resolves.toBeUndefined();

    expect(deleteReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(deleteReply).toBeCalledTimes(1);
  });
});
