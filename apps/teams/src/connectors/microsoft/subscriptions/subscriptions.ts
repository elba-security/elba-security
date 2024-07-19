import { addDays } from 'date-fns';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';
import { MicrosoftError } from '@/connectors/microsoft/commons/error';

const subscriptionSchema = z.object({
  id: z.string(),
  resource: z.string(),
  changeType: z.string(),
});

type CreateSubscriptionData = {
  encryptToken: string;
  changeType: string;
  resource: string;
};

export type MicrosoftSubscription = z.infer<typeof subscriptionSchema>;

const getJson = async (response: Response) => {
  try {
    return (await response.json()) as object;
  } catch (err) {
    return {};
  }
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
      includeResourceData: true,
      encryptionCertificate: env.MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE,
      encryptionCertificateId: env.MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE_ID,
    }),
  });

  if (!response.ok) {
    const error = await getJson(response);
    logger.warn('Failed to create subscription', {
      resource,
      changeType,
      status: response.status,
      microsoftError: error,
    });

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
    const error = await getJson(response);
    logger.warn('Failed to delete subscription', {
      subscriptionId,
      status: response.status,
      microsoftError: error,
    });
    return null;
  }

  return { message: 'subscription has been deleted' };
};
