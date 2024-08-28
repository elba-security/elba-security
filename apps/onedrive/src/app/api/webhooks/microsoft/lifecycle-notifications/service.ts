import { type ValidSubscriptions } from '@/common/subscriptions';
import { inngest } from '@/inngest/client';

export const handleLifecycleNotifications = async (subscriptions: ValidSubscriptions) => {
  if (!subscriptions.length) {
    return;
  }

  await inngest.send(
    subscriptions.map(({ organisationId, subscriptionId }) => ({
      name: 'onedrive/subscriptions.refresh.triggered',
      data: {
        organisationId,
        subscriptionId,
      },
    }))
  );
};
