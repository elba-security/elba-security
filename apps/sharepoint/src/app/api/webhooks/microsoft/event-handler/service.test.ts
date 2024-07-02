import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import type { SubscriptionPayload, WebhookResponse } from './types';
import { handleWebhook } from './service';

const data: WebhookResponse<SubscriptionPayload> = {
  value: [
    {
      subscriptionId: 'subscription-id-0',
      resource: 'sites/siteId-0/drives/driveId-0/root',
      tenantId: 'b783626c-d5f5-40a5-9490-90a947e22e42',
      clientState: 'some-state',
    },
    {
      subscriptionId: 'subscription-id-1',
      resource: 'sites/siteId-1/drives/driveId-1/root',
      tenantId: 'b783626c-d5f5-40a5-9490-90a947e11e31',
      clientState: 'some-state',
    },
  ],
};

const invalidData: WebhookResponse<SubscriptionPayload> = {
  value: [
    {
      subscriptionId: 'subscription-id-0',
      resource: 'sites/siteId-0/drives/driveId-0/root',
      tenantId: 'b783626c-d5f5-40a5-9490-90a947e22e42',
      clientState: 'some-state',
    },
    {
      subscriptionId: 'subscription-id-1',
      resource: 'sites/siteId/root',
      tenantId: 'b783626c-d5f5-40a5-9490-90a947e11e31',
      clientState: 'some-state',
    },
  ],
};

describe('handleWebhook', () => {
  test('should send an event when the payload is correct', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(data.value)).resolves.toBeUndefined();

    expect(send).toBeCalledWith(
      data.value.map((payload, index) => {
        return {
          id: `update-items-subscription-${payload.subscriptionId}`,
          name: 'sharepoint/update-items.triggered',
          data: {
            siteId: `siteId-${index}`,
            driveId: `driveId-${index}`,
            subscriptionId: payload.subscriptionId,
            tenantId: payload.tenantId,
            skipToken: null,
          },
        };
      })
    );
    expect(send).toBeCalledTimes(1);
  });

  test('should send an event with valid resources', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook(invalidData.value)).resolves.toBeUndefined();

    expect(send).toBeCalledWith([
      {
        id: `update-items-subscription-subscription-id-0`,
        name: 'sharepoint/update-items.triggered',
        data: {
          siteId: 'siteId-0',
          driveId: 'driveId-0',
          subscriptionId: 'subscription-id-0',
          tenantId: 'b783626c-d5f5-40a5-9490-90a947e22e42',
          skipToken: null,
        },
      },
    ]);

    expect(send).toBeCalledTimes(1);
  });

  test('should not send an event when no data is provided', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(handleWebhook([])).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });
});
