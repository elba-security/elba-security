import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { decrypt, encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import * as replyConnector from '@/connectors/microsoft/replies/replies';
import * as teamConnector from '@/connectors/microsoft/teams/teams';
import type { MicrosoftReply } from '@/connectors/microsoft/types';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import { omitMessageContent } from '@/common/utils';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

const token = 'token';
const encryptedToken = await encrypt(token);

const organisations = [
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    tenantId: 'tenant-id',
    region: 'us',
    token: encryptedToken,
  },
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e1',
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

describe('reply-created-updated', () => {
  test('should exit when the messageId or replyId is not provided', async () => {
    await db.insert(organisationsTable).values(organisations);

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

  test('should throw when there are no organisations for that tenant', async () => {
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

  test('should exit if the team is not received', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(null);

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

    await expect(result).resolves.toBe('Could not find a team');

    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);
  });

  test('should exit when the reply is not received or the messageType is not "message"', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

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

    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(invalidReply);

    await expect(result).resolves.toBe('Ignoring invalid reply');

    expect(getReply).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'invalid-message-id',
      replyId: 'reply-id',
    });
    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);
    expect(getReply).toBeCalledTimes(1);
  });

  test('should request-to-upsert-reply for all organisation within same tenant', async () => {
    await db.insert(organisationsTable).values(organisations);
    await db.insert(channelsTable).values(channels);

    const [result, { step }] = setup({
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

    const getTeam = vi.spyOn(teamConnector, 'getTeam').mockResolvedValue(team);

    const getReply = vi.spyOn(replyConnector, 'getReply').mockResolvedValue(reply);

    await expect(result).resolves.toBeUndefined();

    expect(getTeam).toBeCalledWith(await decrypt(encryptedToken), 'team-id');
    expect(getTeam).toBeCalledTimes(1);

    expect(getReply).toBeCalledWith({
      token: await decrypt(encryptedToken),
      teamId: 'team-id',
      channelId: 'channel-id',
      messageId: 'message-id',
      replyId: 'reply-id',
    });
    expect(getReply).toBeCalledTimes(1);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-to-upsert-reply',
      organisations.map((org) => ({
        name: 'teams/data.protection.object.upsert.requested',
        data: {
          organisationId: org.id,
          region: org.region,
          teamId: team.id,
          teamName: team.displayName,
          channelId: 'channel-id',
          messageId: 'message-id',
          replyId: reply.id,
          message: omitMessageContent(reply),
        },
      }))
    );
  });
});
