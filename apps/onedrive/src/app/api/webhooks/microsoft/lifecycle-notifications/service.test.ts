import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { type ValidSubscriptions } from '@/common/subscriptions';
import { handleLifecycleNotifications } from './service';

const data: ValidSubscriptions = [
  {
    subscriptionId: 'subscription-id-1',
    organisationId: 'organisation-id-1',
    tenantId: 'tenant-id-1',
    clientState: 'state-1',
    userId: 'userId-1',
  },
  {
    subscriptionId: 'subscription-id-2',
    organisationId: 'organisation-id-2',
    tenantId: 'tenant-id-2',
    clientState: 'state-2',
    userId: 'userId-1',
  },
];

describe('handleLifecycleNotification', () => {
  test('should successfully send events to refresh subscriptions', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleLifecycleNotifications(data)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith(
      data.map(({ organisationId, subscriptionId }) => ({
        name: 'onedrive/subscriptions.refresh.triggered',
        data: {
          organisationId,
          subscriptionId,
        },
      }))
    );
  });

  test('should not send event to refresh subscription when no data is provided', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleLifecycleNotifications([])).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });
});
