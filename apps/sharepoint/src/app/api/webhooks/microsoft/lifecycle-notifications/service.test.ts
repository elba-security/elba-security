import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import type { MicrosoftSubscriptionEvent } from '@/connectors/microsoft/lifecycle-events/lifecycle-events';
import { handleSubscriptionEvent } from './service';
import type { SubscriptionRefresh } from './types';

const organisations = [
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
    token: await encrypt('token'),
    tenantId: 'b783626c-d5f5-40a5-9490-90a947e22e42',
    region: 'us',
  },
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c80',
    token: await encrypt('token'),
    tenantId: 'b783626c-d5f5-40a5-9490-90a947e11e31',
    region: 'us',
  },
];

const data: MicrosoftSubscriptionEvent[] = [
  {
    subscriptionId: 'subscription-id-0',
    lifecycleEvent: 'reauthorizationRequired',
    organizationId: 'b783626c-d5f5-40a5-9490-90a947e22e42',
    clientState: 'some-state',
  },
  {
    subscriptionId: 'subscription-id-1',
    lifecycleEvent: 'reauthorizationRequired',
    organizationId: 'b783626c-d5f5-40a5-9490-90a947e11e31',
    clientState: 'some-state',
  },
];

const subscriptionEvents: SubscriptionRefresh[] = [
  {
    organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
    subscriptionId: 'subscription-id-0',
  },
  {
    organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c80',
    subscriptionId: 'subscription-id-1',
  },
];

describe('handleWebhook', () => {
  test('should send an event when the payload is correct', async () => {
    await db.insert(organisationsTable).values(organisations);
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(
      handleSubscriptionEvent(data.map((v) => ({ ...v, tenantId: v.organizationId })))
    ).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      subscriptionEvents.map((event) => ({
        id: `subscribe-event-${event.subscriptionId}`,
        name: 'sharepoint/subscription.refresh.triggered',
        data: event,
      }))
    );

    expect(send).toBeCalledTimes(1);
  });

  test('should not refresh subscription when no data is provided', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleSubscriptionEvent([])).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });
});
