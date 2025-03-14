import { createSubscriptionToChannels } from './create-subscription-to-channels';
import { createSubscriptionToChannelMessages } from './create-subscription-to-channel-messages';
import { refreshSubscription } from './refresh-subscription';
import { startRecreateSubscriptionsForOrganisations } from './start-recreate-subscriptions-for-organisations';
import { recreateSubscriptionsForOrganisation } from './recreate-subscriptions-for-organisation';
import { removeSubscription } from './remove-subscription';

export const subscriptionsFunctions = [
  createSubscriptionToChannelMessages,
  createSubscriptionToChannels,
  recreateSubscriptionsForOrganisation,
  refreshSubscription,
  removeSubscription,
  startRecreateSubscriptionsForOrganisations,
];
