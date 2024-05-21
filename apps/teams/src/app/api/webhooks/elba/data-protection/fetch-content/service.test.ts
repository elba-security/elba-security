import { describe, expect, test, vi } from 'vitest';
import { decrypt, encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import { fetchDataProtectionContent } from '@/app/api/webhooks/elba/data-protection/fetch-content/service';
import type { MicrosoftMessage, MicrosoftReply } from '@/connectors/microsoft/types';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';

const encryptedToken = await encrypt('token');

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

const message: MicrosoftMessage = {
  id: 'some-id',
  webUrl: 'http://wb.uk.com',
  etag: `122123213`,
  createdDateTime: '2023-03-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  from: {
    user: {
      id: 'user-id',
    },
    application: null,
  },
  messageType: 'message',
  type: 'message',
  body: {
    content: 'content',
  },
  replies: [],
};

const reply: MicrosoftReply = {
  id: `reply-id`,
  webUrl: `http://wb.uk.com`,
  etag: `122123213`,
  createdDateTime: '2023-03-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  messageType: 'message',
  body: {
    content: `content`,
  },
  from: {
    user: {
      id: `user-id`,
    },
    application: null,
  },
  type: 'reply',
};
describe('fetchDataProtectionContent', () => {
  test('should throw if the organization not received', async () => {
    await expect(
      fetchDataProtectionContent({ organisationId: organisation.id, metadata: messageMetadata })
    ).rejects.toThrowError();
  });

  test('should fetch message object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(message);

    await expect(
      fetchDataProtectionContent({ organisationId: organisation.id, metadata: messageMetadata })
    ).resolves.toStrictEqual(message);

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(getMessage).toBeCalledTimes(1);
  });

  test('should fetch reply object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);

    await expect(
      fetchDataProtectionContent({ organisationId: organisation.id, metadata: replyMetadata })
    ).resolves.toStrictEqual(reply);

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(getReply).toBeCalledTimes(1);
  });
});
