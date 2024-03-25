/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { http } from 'msw';
import { env } from '@/env';
import {
  createSubscription,
  deleteSubscription,
  refreshSubscription,
} from '@/connectors/microsoft/subscriptions/subscriptions';
import { encrypt } from '@/common/crypto';
import { server } from '../../../../vitest/setup-msw-handlers';

const validToken = 'token';
const invalidDataToken = 'invalid-data-token';
const encryptedToken = await encrypt(validToken);
const encryptedInvalidDataToken = await encrypt(invalidDataToken);
const invalidToken = 'invalid-token';

type CreateSubscriptionBody = {
  changeType: string;
  notificationUrl: string;
  lifecycleNotificationUrl: string;
  resource: string;
  expirationDateTime: string;
};

const subscriptionResource =
  Math.random() > 0.5 ? 'teams/getAllChannels' : 'teams/team-id-1/channels/channel-id-1/messages';

const subscriptionChangeType = Math.random() > 0.5 ? 'created,updated,deleted' : 'created,deleted';

const subscription = {
  id: 'subscription-id',
  resource: subscriptionResource,
};

describe('subscriptions connector', () => {
  describe('createSubscription', () => {
    beforeEach(() => {
      vi.useFakeTimers();

      server.use(
        http.post(`${env.MICROSOFT_API_URL}/subscriptions`, async ({ request }) => {
          const body = (await request.json()) as CreateSubscriptionBody;

          if (
            body.changeType !== subscriptionChangeType ||
            body.resource !== subscriptionResource ||
            body.notificationUrl !== `${env.WEBHOOK_URL}/api/webhooks/microsoft/event-handler` ||
            body.lifecycleNotificationUrl !==
              `${env.WEBHOOK_URL}/api/webhooks/microsoft/lifecycle-notifications`
          ) {
            return new Response(undefined, { status: 400 });
          }

          if (request.headers.get('Authorization') === `Bearer ${invalidDataToken}`) {
            return Response.json(null);
          }

          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(subscription);
        })
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should return the subscription when the token is valid, and resource and changeType are valid too', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(
        createSubscription({
          encryptToken: encryptedToken,
          resource: subscriptionResource,
          changeType: subscriptionChangeType,
        })
      ).resolves.toStrictEqual(subscription);
    });

    test('should throw when the token is invalid, and resource and changeType are valid', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(
        createSubscription({
          encryptToken: invalidToken,
          resource: subscriptionResource,
          changeType: subscriptionChangeType,
        })
      ).rejects.toThrowError();
    });

    test('should exit if the data is invalid', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(
        createSubscription({
          encryptToken: encryptedInvalidDataToken,
          resource: subscriptionResource,
          changeType: subscriptionChangeType,
        })
      ).resolves.toBeNull();
    });

    test('should throw when the token is invalid, and resource and changeType are invalid', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(
        createSubscription({
          encryptToken: encryptedToken,
          resource: 'invalid/resource',
          changeType: 'invalid-event',
        })
      ).rejects.toThrowError();
    });
  });

  describe('refreshSubscription', () => {
    beforeEach(() => {
      vi.useFakeTimers();

      server.use(
        http.patch(
          `${env.MICROSOFT_API_URL}/subscriptions/:subscriptionId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.subscriptionId !== subscription.id) {
              return new Response(undefined, { status: 400 });
            }

            return undefined;
          }
        )
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should refresh the subscription when the token is valid', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(refreshSubscription(encryptedToken, subscription.id)).resolves.toBeUndefined();
    });

    test('should throw when the token is invalid', async () => {
      const date = new Date(2024, 3, 2, 12).toISOString();
      vi.setSystemTime(date);
      await expect(refreshSubscription(invalidToken, subscription.id)).rejects.toThrowError();
    });
  });

  describe('deleteSubscription', () => {
    beforeEach(() => {
      server.use(
        http.delete(
          `${env.MICROSOFT_API_URL}/subscriptions/:subscriptionId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.subscriptionId !== subscription.id) {
              return new Response(undefined, { status: 400 });
            }

            return undefined;
          }
        )
      );
    });

    test('should delete the subscription when the token is valid', async () => {
      await expect(deleteSubscription(encryptedToken, subscription.id)).resolves.toBeUndefined();
    });

    test('should throw when the token is invalid', async () => {
      await expect(deleteSubscription(invalidToken, subscription.id)).rejects.toThrowError();
    });
  });
});
