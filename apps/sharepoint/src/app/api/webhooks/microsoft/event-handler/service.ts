import { inngest } from '@/inngest/client';
import { type ValidSubscriptions } from '@/common/subscriptions';

export const handleWebhookEvents = async (subscriptions: ValidSubscriptions) => {
  if (!subscriptions.length) {
    return;
  }

  await inngest.send(
    subscriptions.map(({ tenantId, subscriptionId, siteId, driveId }) => ({
      name: 'sharepoint/update-items.triggered',
      data: {
        siteId,
        driveId,
        subscriptionId,
        tenantId,
        skipToken: null,
      },
    }))
  );
};
