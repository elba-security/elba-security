import { addDays } from 'date-fns';
import { z } from 'zod';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';

const subscriptionSchema = z.object({
  id: z.string(),
  resource: z.string(),
});

type CreateSubscriptionData = {
  encryptToken: string;
  changeType: string;
  resource: string;
};
export const createSubscription = async ({
  encryptToken,
  resource,
  changeType,
}: CreateSubscriptionData) => {
  const token = await decrypt(encryptToken);

  const response = await fetch(`${env.MICROSOFT_API_URL}/subscriptions`, {
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
    }),
  });
  const data = (await response.json()) as object;
  const result = subscriptionSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return result.data;
};

export const refreshSubscription = async (encryptToken: string, subscriptionId: string) => {
  const token = await decrypt(encryptToken);

  await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      expirationDateTime: addDays(new Date(), Number(env.SUBSCRIBE_EXPIRATION_DAYS)).toISOString(),
    }),
  });
};

export const deleteSubscription = async (encryptToken: string, subscriptionId: string) => {
  const token = await decrypt(encryptToken);

  await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
};
