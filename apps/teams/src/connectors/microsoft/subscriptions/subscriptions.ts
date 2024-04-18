import { addDays } from 'date-fns';
import { z } from 'zod';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';
import { MicrosoftError } from '@/connectors/microsoft/commons/error';

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
      clientState: env.MICROSOFT_WEBHOOK_SECRET_KEY,
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError(`Could not subscribe to resource=${resource}`, { response });
  }

  const data = (await response.json()) as object;
  const result = subscriptionSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return result.data;
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
    throw new MicrosoftError(`Could not refresh subscription subscriptionId=${subscriptionId}`, {
      response,
    });
  }
  return { message: 'subscription has been updated' };
};

export const deleteSubscription = async (encryptToken: string, subscriptionId: string) => {
  const token = await decrypt(encryptToken);

  const response = await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError(`Could not delete to resource=${subscriptionId}`, { response });
  }

  return { message: 'subscription has been deleted' };
};
