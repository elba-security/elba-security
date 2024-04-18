import { createSubscriptionToChannels } from '@/inngest/functions/subscriptions/create-subscription-to-channels';
import { createSubscriptionToChannelMessages } from '@/inngest/functions/subscriptions/create-subscription-to-channel-messages';
import { refreshSubscription } from '@/inngest/functions/subscriptions/refresh-subscription';

export const subscriptionsFunctions = [
  createSubscriptionToChannels,
  createSubscriptionToChannelMessages,
  refreshSubscription,
];
