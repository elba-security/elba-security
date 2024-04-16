import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { decrypt, encrypt } from '@/common/crypto';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

const token = 'token';
const encryptedToken = await encrypt(token);
const repliesSkipToken = 'MSwwLDE3MTE0NDI3MTE1MTI';

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

const message: MicrosoftMessage = {
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
  body: {
    content: 'content',
  },
  replies: [],
  'replies@odata.nextLink': `https://graph.microsoft-api-test-url.com/v1.0/teams('team-id')/channels('channel-id')/messages('message-id')/replies?$skipToken=${repliesSkipToken}`,
};

const invalidMessage: MicrosoftMessage = {
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
  type: 'message',
  body: {
    content: 'invalid content content',
  },
  replies: [
    {
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
    },
  ],
  'replies@odata.nextLink': `https://graph.microsoft-api-test-url.com/v1.0/teams('team-id')/replies?$skipToken=${repliesSkipToken}`,
};

const formatObject = {
  id: `${organisation.id}:message-id`,
  name: '#channel-name - 2023-03-28',
  metadata: {
    teamId: 'team-id',
    organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    channelId: 'channel-id',
    messageId: 'message-id',
    type: 'message',
  },
  updatedAt: '2024-02-28T21:11:12.395Z',
  ownerId: 'user-id',
  permissions: [{ type: 'domain', id: 'domain' }],
  url: 'http://wb.uk.com',
  //contentHash: '122123213',
};

describe('message-created-updated', () => {
  test('should exit when the messageId is not provided', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.MessageCreated,
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
        event: EventType.MessageCreated,
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
        event: EventType.MessageCreated,
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

  test('should exit when the message is not received or the messageType is not "message"', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(channelsTable).values(channel);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'invalid-message-id',
        event: EventType.MessageCreated,
      },
    });

    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(invalidMessage);

    await expect(result).resolves.toBeUndefined();

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'invalid-message-id',
    });
    expect(getMessage).toBeCalledTimes(1);
  });

  test('should insert the messageId into the db and send it to Elba ', async () => {
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
        event: EventType.MessageCreated,
      },
    });
    const getMessage = vi.spyOn(messageConnector, 'getMessage').mockResolvedValue(message);

    await expect(result).resolves.toBeUndefined();

    expect(getMessage).toBeCalledWith({
      token: await decrypt(organisation.token),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'message-id',
    });
    expect(getMessage).toBeCalledTimes(1);

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({ objects: [formatObject] });
  });
});
