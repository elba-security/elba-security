import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { refreshDataProtectionObject } from '@/inngest/functions/data-protection/refresh-data-protection-object';
import { decrypt, encrypt } from '@/common/crypto';
import type { MessageMetadata } from '@/connectors/elba/data-protection/metadata';
import type { MicrosoftMessage, MicrosoftReply } from '@/connectors/microsoft/types';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import * as teamConnector from '@/connectors/microsoft/teams/teams';

const setup = createInngestFunctionMock(
  refreshDataProtectionObject,
  'teams/data_protection.refresh_object.requested'
);

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const channel = {
  id: `${organisation.id}:channel-id`,
  channelId: 'channel-id',
  membershipType: 'standard',
  displayName: 'channel-name',
  organisationId: organisation.id,
};

const team: MicrosoftTeam = { id: 'team-id', displayName: 'team-name', visibility: 'public' };

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

const formatMessageObject = {
  id: `${organisation.id}:some-id`,
  name: 'team-name - #channel-name - 2023-03-28',
  metadata: {
    teamId: 'team-id',
    organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    channelId: 'channel-id',
    messageId: 'message-id',
    replyId: undefined,
    type: 'message',
  },
  updatedAt: '2024-02-28T21:11:12.395Z',
  ownerId: 'user-id',
  permissions: [{ type: 'domain', id: 'domain' }],
  url: 'http://wb.uk.com',
  //contentHash: '122123213',
};

const formatReplyObject = {
  id: `${organisation.id}:reply-id`,
  name: 'team-name - #channel-name - 2023-03-28',
  metadata: {
    teamId: 'team-id',
    organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    channelId: 'channel-id',
    messageId: 'message-id',
    replyId: 'reply-id',
    type: 'reply',
  },
  updatedAt: '2024-02-28T21:11:12.395Z',
  ownerId: 'user-id',
  permissions: [{ type: 'domain', id: 'domain' }],
  url: 'http://wb.uk.com',
  //contentHash: '122123213',
};

describe('refresh-data-protection-object', () => {
  test('should throw if the organisation is not found', async () => {
    // @ts-expect-error this is a mock
    const [result] = setup(null);
    await expect(result).rejects.toThrowError();
  });

  test('should delete the message from Elba if the message was deleted in ms', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, metadata: messageMetadata });

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(null);

    await expect(result).resolves.toBeUndefined();

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(getMessage).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: [`${organisation.id}:${messageMetadata.messageId}`],
    });
  });

  test('should update the message in Elba if the channel is not received', async () => {
    await db.insert(organisationsTable).values(organisation);

    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id, metadata: messageMetadata });

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(message);
    await expect(result).rejects.toThrowError();

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(getMessage).toBeCalledTimes(1);

    expect(elba).toBeCalledTimes(1);
  });

  test('should update the message in elba client if the message received', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id, metadata: messageMetadata });

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(message);
    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);
    await expect(result).resolves.toBeUndefined();

    expect(getTeam).toBeCalledWith(organisation.token, messageMetadata.teamId);
    expect(getTeam).toBeCalledTimes(1);

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: messageMetadata.teamId,
      channelId: messageMetadata.channelId,
      messageId: messageMetadata.messageId,
    });
    expect(getMessage).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [formatMessageObject],
    });
  });

  test('should delete the reply from Elba if the reply was deleted in ms', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, metadata: replyMetadata });

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(null);

    await expect(result).resolves.toBeUndefined();

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(getReply).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: [`${organisation.id}:${replyMetadata.replyId}`],
    });
  });

  test('should update the reply in Elba if the channel is not received', async () => {
    await db.insert(organisationsTable).values(organisation);

    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id, metadata: replyMetadata });

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);
    await expect(result).rejects.toThrowError();

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(getReply).toBeCalledTimes(1);

    expect(elba).toBeCalledTimes(1);
  });

  test('should update the reply in Elba client if the reply received', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id, metadata: replyMetadata });

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);
    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);
    await expect(result).resolves.toBeUndefined();

    expect(getTeam).toBeCalledWith(organisation.token, messageMetadata.teamId);
    expect(getTeam).toBeCalledTimes(1);
    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: replyMetadata.teamId,
      channelId: replyMetadata.channelId,
      messageId: replyMetadata.messageId,
      replyId: replyMetadata.replyId,
    });
    expect(getReply).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [formatReplyObject],
    });
  });
});
