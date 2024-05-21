import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
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

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

describe('message-deleted', () => {
  test('should exit when the messageId is not provided', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.MessageDeleted,
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
        event: EventType.MessageDeleted,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should delete the message from Elba', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        messageId: 'message-id',
        event: EventType.MessageDeleted,
      },
    });

    await expect(result).resolves.toBeUndefined();

    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elba).toBeCalledTimes(1);

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: [`${organisation.id}:message-id`],
    });
  });
});
