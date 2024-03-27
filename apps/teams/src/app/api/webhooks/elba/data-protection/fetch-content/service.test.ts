import { describe, expect, test, vi } from 'vitest';
import { decrypt, encrypt } from '@/common/crypto';
import type { ElbaPayload } from '@/app/api/webhooks/elba/data-protection/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import { fetchDataProtectionContent } from '@/app/api/webhooks/elba/data-protection/fetch-content/service';
import type { MicrosoftMessage, MicrosoftReply } from '@/connectors/microsoft/types';

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
    await expect(fetchDataProtectionContent(messageData)).rejects.toThrowError();
  });

  test('should fetch message object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(message);

    await expect(fetchDataProtectionContent(messageData)).resolves.toStrictEqual(message);

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageData.metadata.teamId,
      channelId: messageData.metadata.channelId,
      messageId: messageData.metadata.messageId,
    });
    expect(getMessage).toBeCalledTimes(1);
  });

  test('should fetch reply object', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);

    await expect(fetchDataProtectionContent(replyData)).resolves.toStrictEqual(reply);

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyData.metadata.teamId,
      channelId: replyData.metadata.channelId,
      messageId: replyData.metadata.messageId,
      replyId: replyData.metadata.replyId,
    });
    expect(getReply).toBeCalledTimes(1);
  });
});
