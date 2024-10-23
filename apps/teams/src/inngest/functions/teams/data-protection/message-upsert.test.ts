import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { messageUpsert } from '@/inngest/functions/teams/data-protection/message-upsert';
import { channelsTable, organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { type MicrosoftMessageObjectWithoutContent } from '@/connectors/elba/types';

const setup = createInngestFunctionMock(
  messageUpsert,
  'teams/data.protection.object.upsert.requested'
);
const organisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a9e8';

const message: MicrosoftMessageObjectWithoutContent = {
  id: 'message-id',
  webUrl: 'http://wb.uk.com',
  etag: '122123213',
  createdDateTime: '2023-03-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  from: {
    user: {
      id: 'user-id',
    },
    application: {
      id: 'application-id',
    },
  },
  messageType: 'message',
  type: 'message',
  body: null,
};

const formatedMessageObject = {
  id: `${organisationId}:message-id`,
  name: 'team-name - #channel-name - 2023-03-28',
  metadata: {
    teamId: 'team-id',
    organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    channelId: 'channel-id',
    messageId: 'message-id',
    type: 'message',
    replyId: undefined,
  },
  updatedAt: '2024-02-28T21:11:12.395Z',
  ownerId: 'user-id',
  permissions: [{ type: 'domain', id: 'domain' }],
  url: 'http://wb.uk.com',
};

const reply: MicrosoftMessageObjectWithoutContent = {
  id: 'reply-id',
  webUrl: 'http://wb.uk.com',
  etag: '122123213',
  createdDateTime: '2023-03-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  from: {
    user: {
      id: 'user-id',
    },
    application: {
      id: 'application-id',
    },
  },
  messageType: 'message',
  type: 'reply',
  body: null,
};

const formatedReplyObject = {
  id: `${organisationId}:reply-id`,
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
};

const organisation = {
  id: organisationId,
  tenantId: 'tenant-id',
  region: 'US',
  token: 'token',
};

const channel = {
  id: 'channel-id',
  organisationId,
  membershipType: 'standard',
  displayName: 'channel-name',
};

describe('message-delete', () => {
  test('should upsert data-protection (message) object to elba', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const elba = spyOnElba();
    const [result] = setup({
      organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
      region: 'US',
      messageId: 'message-id',
      teamId: 'team-id',
      teamName: 'team-name',
      channelId: 'channel-id',
      message,
    });

    await expect(result).resolves.toBeUndefined();

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [formatedMessageObject],
    });
  });

  test('should upsert data-protection (reply) object to elba', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const elba = spyOnElba();
    const [result] = setup({
      organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
      region: 'US',
      messageId: 'message-id',
      teamId: 'team-id',
      teamName: 'team-name',
      channelId: 'channel-id',
      replyId: reply.id,
      message: reply,
    });

    await expect(result).resolves.toBeUndefined();

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [formatedReplyObject],
    });
  });
});
