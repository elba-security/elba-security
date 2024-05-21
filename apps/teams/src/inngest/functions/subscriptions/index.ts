import { createSubscriptionToChannels } from '@/inngest/functions/subscriptions/create-subscription-to-channels';
import { createSubscriptionToChannelMessages } from '@/inngest/functions/subscriptions/create-subscription-to-channel-messages';
import { refreshSubscription } from '@/inngest/functions/subscriptions/refresh-subscription';
import { startRecreateSubscriptionsForOrganisations } from '@/inngest/functions/subscriptions/start-recreate-subscriptions-for-organisations';
import { recreateSubscriptionsForOrganisation } from '@/inngest/functions/subscriptions/recreate-subscriptions-for-organisation';

export const subscriptionsFunctions = [
  createSubscriptionToChannels,
  createSubscriptionToChannelMessages,
  refreshSubscription,
  startRecreateSubscriptionsForOrganisations,
  recreateSubscriptionsForOrganisation,
];
