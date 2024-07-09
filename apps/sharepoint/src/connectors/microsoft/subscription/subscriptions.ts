import { z } from 'zod';
import { addDays } from 'date-fns';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { decrypt } from '@/common/crypto';

export const incomingSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  resource: z.string(),
  tenantId: z.string(),
  clientState: z.string(),
});

export const incomingSubscriptionArraySchema = z.object({
  value: z.array(incomingSubscriptionSchema),
});

const subscriptionSchema = z.object({
  id: z.string(),
  expirationDateTime: z.string(),
  clientState: z.string(),
});

type CreateSubscriptionParams = {
  token: string;
  changeType: string;
  resource: string;
  clientState: string;
};

export type Subscription = z.infer<typeof subscriptionSchema>;

export const createSubscription = async ({
  token,
  changeType,
  resource,
  clientState,
}: CreateSubscriptionParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/subscriptions`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      changeType,
      notificationUrl: `${env.WEBHOOK_URL}/api/webhooks/microsoft/event-handler`,
      lifecycleNotificationUrl: `${env.WEBHOOK_URL}/api/webhooks/microsoft/lifecycle-notifications`,
      resource,
      expirationDateTime: addDays(new Date(), Number(env.SUBSCRIBE_EXPIRATION_DAYS)).toISOString(),
      clientState,
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve create subscription', { response });
  }

  const data = (await response.json()) as Subscription;

  return subscriptionSchema.parse(data);
};

export const refreshSubscription = async (encryptToken: string, subscriptionId: string) => {
  const token = await decrypt(encryptToken);

  const response = await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      expirationDateTime: addDays(new Date(), Number(env.SUBSCRIBE_EXPIRATION_DAYS)).toISOString(),
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve create subscription', { response });
  }

  const data = (await response.json()) as Subscription;

  return subscriptionSchema.parse(data);
};

export const removeSubscription = async (encryptToken: string, subscriptionId: string) => {
  const token = await decrypt(encryptToken);

  await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
};
