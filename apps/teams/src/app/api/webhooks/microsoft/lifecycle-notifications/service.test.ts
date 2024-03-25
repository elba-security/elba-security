import { describe, expect, test, vi } from 'vitest';
import { handleSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/service';
import { inngest } from '@/inngest/client';
import type { MicrosoftSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';

const organisationId = '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d';

const data: MicrosoftSubscriptionEvent[] = [
  {
    subscriptionId: 'subscription-id-0',
    lifecycleEvent: 'reauthorizationRequired',
    resource: 'resource(/0)',
    subscriptionExpirationDateTime: '2024-03-13T08:36:42.751Z',
    organizationId: organisationId,
  },
  {
    subscriptionId: 'subscription-id-1',
    lifecycleEvent: 'subscriptionRemoved',
    resource: 'resource(/1)',
    organizationId: organisationId,
    subscriptionExpirationDateTime: '2024-03-13T08:16:42.751Z',
  },
];

describe('handleSubscribeEvent', () => {
  test('should refresh subscription when data is valid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleSubscriptionEvent(data)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      data.map((subscribe) => ({
        id: `subscribe-event-${subscribe.subscriptionId}`,
        name: 'teams/subscription.refresh.triggered',
        data: {
          organisationId: subscribe.organizationId,
          subscriptionId: subscribe.subscriptionId,
        },
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
