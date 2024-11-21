import { inngest } from '@/inngest/client';
import { type ValidSubscriptions } from '@/common/subscriptions';

export const handleWebhookEvents = async (subscriptions: ValidSubscriptions) => {
  if (!subscriptions.length) {
    return;
  }

  await inngest.send(
    subscriptions.map(({ tenantId, subscriptionId, userId }) => ({
      name: 'onedrive/delta.sync.triggered',
      data: {
        userId,
        subscriptionId,
        tenantId,
        skipToken: null,
      },
    }))
  );
};
