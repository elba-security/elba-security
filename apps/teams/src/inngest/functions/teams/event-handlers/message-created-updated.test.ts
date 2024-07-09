import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { decrypt, encrypt } from '@/common/crypto';
import * as messageConnector from '@/connectors/microsoft/messages/messages';
import * as teamConnector from '@/connectors/microsoft/teams/teams';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import { omitMessageContent } from '@/common/utils';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

const token = 'token';
const encryptedToken = await encrypt(token);
const repliesSkipToken = 'MSwwLDE3MTE0NDI3MTE1MTI';

const organisations = [
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    tenantId: 'tenant-id',
    region: 'us',
    token: encryptedToken,
  },
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e7',
    tenantId: 'tenant-id',
    region: 'us',
    token: encryptedToken,
  },
];

const channels = organisations.map((org) => ({
  id: 'channel-id',
  membershipType: 'standard',
  displayName: 'channel-name',
  organisationId: org.id,
}));

const team: MicrosoftTeam = { id: 'team-id', displayName: 'team-name', visibility: 'public' };

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

describe('message-created-updated', () => {
  test('should exit when the messageId is not provided', async () => {
    await db.insert(organisationsTable).values(organisations);

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

  test('should exit when the message is not received or the messageType is not "message"', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

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

    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(null);

    await expect(result).resolves.toBe('Could not find a team');

    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);
  });

  test('should exit when the message is not received or the messageType is not "message"', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

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
    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);

    await expect(result).resolves.toBe('Ignoring invalid message');

    expect(getMessage).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'invalid-message-id',
    });
    expect(getMessage).toBeCalledTimes(1);

    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);
  });

  test('should request-to-upsert-message for all organisation within same tenant', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

    const [result, { step }] = setup({
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
    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);

    await expect(result).resolves.toBeUndefined();

    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);

    expect(getMessage).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'message-id',
    });
    expect(getMessage).toBeCalledTimes(1);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-to-upsert-message',
      organisations.map((org) => ({
        name: 'teams/data.protection.object.upsert.requested',
        data: {
          organisationId: org.id,
          region: org.region,
          teamId: team.id,
          teamName: team.displayName,
          channelId: 'channel-id',
          messageId: 'message-id',
          message: omitMessageContent(message),
        },
      }))
    );
  });
});
