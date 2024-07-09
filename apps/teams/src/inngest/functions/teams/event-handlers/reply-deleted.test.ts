import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

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

describe('reply-deleted', () => {
  test('should exit when the messageId or replyId is not provided', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.ReplyDeleted,
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
        event: EventType.ReplyDeleted,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should request to delete data protection object', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        replyId: 'reply-id',
        event: EventType.ReplyDeleted,
      },
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-reply-delete',
      organisations.map((org) => ({
        name: 'teams/data.protection.object.delete.requested',
        data: {
          organisationId: org.id,
          region: org.region,
          messageId: 'reply-id',
        },
      }))
    );
  });
});
