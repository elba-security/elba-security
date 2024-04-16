import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { decrypt, encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import type { MicrosoftReply } from '@/connectors/microsoft/types';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
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

const reply: MicrosoftReply = {
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
  body: {
    content: 'content',
  },
};

const invalidReply: MicrosoftReply = {
  id: 'invalid-message-id',
  webUrl: 'http://wb.uk.com',
  etag: '22222222',
  createdDateTime: '2023-02-28T21:11:12.395Z',
  lastEditedDateTime: '2024-02-28T21:11:12.395Z',
  from: {
    user: {
      id: 'user-id',
    },
    application: {
      id: 'application-id',
    },
  },
  messageType: 'systemEventMessage',
  type: 'reply',
  body: {
    content: 'invalid content content',
  },
};

const formatObject = {
  id: `${organisation.id}:reply-id`,
  name: '#channel-name - 2023-03-28',
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

describe('reply-created-updated', () => {
  test('should exit when the messageId or replyId is not provided', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.ReplyCreated,
      },
    });

    await expect(result).resolves.toBeUndefined();
  });

  test('should throw when the organisation is not registered', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        replyId: 'reply-id',
        event: EventType.ReplyCreated,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should throw when the channel not received', async () => {
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        replyId: 'reply-id',
        event: EventType.ReplyCreated,
      },
    });

    await expect(
      db
        .select({ id: channelsTable.id })
        .from(channelsTable)
        .where(eq(channelsTable.id, `${organisation.id}:channel-id`))
    ).resolves.toMatchObject([]);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should exit when the reply is not received or the messageType is not "message"', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'invalid-message-id',
        replyId: 'reply-id',
        event: EventType.ReplyCreated,
      },
    });

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(invalidReply);

    await expect(result).resolves.toBeUndefined();

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'invalid-message-id',
      replyId: 'reply-id',
    });
    expect(getReply).toBeCalledTimes(1);
  });

  test('should send the reply to Elba ', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);
    const elba = spyOnElba();
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        replyId: 'reply-id',
        event: EventType.ReplyCreated,
      },
    });
    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);

    await expect(result).resolves.toBeUndefined();

    expect(getReply).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'message-id',
      replyId: 'reply-id',
    });
    expect(getReply).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({ objects: [formatObject] });
  });
});
