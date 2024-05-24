import { describe, expect, test, vi } from 'vitest';
import { handleSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/service';
import { inngest } from '@/inngest/client';
import type { MicrosoftLifecycleHandlerPayload } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

const organisations = [
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
    tenantId: '313b95c5-5dc2-44e8-8ed6-a4ff91a7cf51',
    region: 'us',
    token: 'token',
  },
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a921',
    tenantId: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
    region: 'us',
    token: 'token',
  },
];

const data: MicrosoftLifecycleHandlerPayload['value'] = [
  {
    subscriptionId: 'subscription-id-0',
    lifecycleEvent: 'reauthorizationRequired',
    resource: 'resource(/0)',
    subscriptionExpirationDateTime: '2024-03-13T08:36:42.751Z',
    organizationId: '313b95c5-5dc2-44e8-8ed6-a4ff91a7cf51',
  },
  {
    subscriptionId: 'subscription-id-1',
    lifecycleEvent: 'subscriptionRemoved',
    resource: 'resource(/1)',
    organizationId: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
    subscriptionExpirationDateTime: '2024-03-13T08:16:42.751Z',
  },
];

describe('handleSubscribeEvent', () => {
  test('should refresh subscription when data is valid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisations);

    await expect(handleSubscriptionEvent(data)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      data
        .map((subscription) => ({
          ...subscription,
          organisationId: organisations.find((org) => org.tenantId === subscription.organizationId)
            ?.id,
        }))
        .filter((subscription) => subscription.lifecycleEvent === 'reauthorizationRequired')
        .map(({ subscriptionId, organisationId }) => ({
          name: 'teams/subscription.refresh.requested',
          data: {
            organisationId,
            subscriptionId,
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
