import { z } from 'zod';
import { addDays } from 'date-fns';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';

export const incomingSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  resource: z.string(),
  tenantId: z.string(),
  clientState: z.string(),
});

export type IncomingSubscription = z.infer<typeof incomingSubscriptionSchema>;

export const incomingSubscriptionArraySchema = z.object({
  value: z.array(incomingSubscriptionSchema),
});

const subscriptionSchema = z.object({
  id: z.string(),
  expirationDateTime: z.string(),
  clientState: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const createSubscription = async ({
  token,
  changeType,
  resource,
  clientState,
}: {
  token: string;
  changeType: string;
  resource: string;
  clientState: string;
}) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/subscriptions`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      prefer: 'includesecuritywebhooks',
    },
    body: JSON.stringify({
      changeType,
      notificationUrl: `${env.WEBHOOK_URL}/api/webhooks/microsoft/event-handler`,
      lifecycleNotificationUrl: `${env.WEBHOOK_URL}/api/webhooks/microsoft/lifecycle-notifications`,
      resource,
      expirationDateTime: addDays(
        new Date(),
        Number(env.SUBSCRIPTION_EXPIRATION_DAYS)
      ).toISOString(),
      clientState,
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not create subscription', { response });
  }

  const data: unknown = await response.json();
  const result = subscriptionSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse created subscription', { data, error: result.error });
    throw new Error('Could not parse created subscription');
  }

  return result.data;
};

export const refreshSubscription = async ({
  token,
  subscriptionId,
}: {
  token: string;
  subscriptionId: string;
}) => {
  const response = await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      expirationDateTime: addDays(
        new Date(),
        Number(env.SUBSCRIPTION_EXPIRATION_DAYS)
      ).toISOString(),
    }),
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not refresh subscription', { response });
  }

  const data: unknown = await response.json();
  const result = subscriptionSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse refreshed subscription', { data, error: result.error });
    throw new Error('Could not parse refreshed subscription');
  }

  return result.data;
};

export const removeSubscription = async ({
  token,
  subscriptionId,
}: {
  token: string;
  subscriptionId: string;
}) => {
  const response = await fetch(`${env.MICROSOFT_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not remove subscription', { response });
  }
};
