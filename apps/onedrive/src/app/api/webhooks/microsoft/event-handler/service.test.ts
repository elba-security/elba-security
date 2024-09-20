import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { type ValidSubscriptions } from '@/common/subscriptions';
import { handleWebhookEvents } from './service';

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
    userId: 'userId-2',
  },
];

describe('handleWebhookEvents', () => {
  test('should send an event when the payload is correct', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhookEvents(data)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith(
      data.map(({ subscriptionId, tenantId, userId }) => ({
        name: 'onedrive/delta.sync.triggered',
        data: {
          userId,
          skipToken: null,
          subscriptionId,
          tenantId,
        },
      }))
    );
  });

  test('should not send an event when no data is provided', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhookEvents([])).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });
});
