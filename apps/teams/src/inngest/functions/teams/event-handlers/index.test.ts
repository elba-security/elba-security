import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';

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

describe('teams-handle-teams-webhook-event', () => {
  test('should throw when event does not exist', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup({
      payload: {
        tenantId: 'tenant-id',
        // @ts-expect-error -- This is a unhandled event that doesn't exist
        event: 'unknown',
      },
    });

    await expect(result).rejects.toBeInstanceOf(TypeError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should throw when there are no organisations for that tenant', async () => {
    const [result] = setup({
      payload: {
        subscriptionId: 'subscription-id',
        teamId: 'team-id',
        channelId: 'channel-id',
        tenantId: 'tenant-id',
        event: EventType.MessageDeleted,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });
});
