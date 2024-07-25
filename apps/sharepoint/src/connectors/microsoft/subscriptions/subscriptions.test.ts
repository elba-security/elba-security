import { server } from '@elba-security/test-utils';
import { addDays } from 'date-fns';
import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import {
  createSubscription,
  refreshSubscription,
  removeSubscription,
  type Subscription,
} from './subscriptions';

const validToken = 'token-1234';
const changeType = 'updated';
const resource = `sites/siteId/drives/driveId/root`;
const invalidToken = 'invalid-token';
const subscriptionId = 'subscription-id';
const clientState = 'some-client-state';

const subscription: Subscription = {
  id: 'subscription-id',
  clientState,
  expirationDateTime: addDays(new Date(), Number(env.SUBSCRIPTION_EXPIRATION_DAYS)).toISOString(),
};

describe('subscription connector', () => {
  describe('createSubscription', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.MICROSOFT_API_URL}/subscriptions`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(subscription);
        })
      );
    });

    test('should return subscriptionId and expirationDateTime', async () => {
      await expect(
        createSubscription({ token: validToken, changeType, clientState, resource })
      ).resolves.toStrictEqual(subscription);
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        createSubscription({ token: 'invalid-token', changeType, clientState, resource })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('refreshSubscription', () => {
    beforeEach(() => {
      server.use(
        http.patch(
          `${env.MICROSOFT_API_URL}/subscriptions/:subscriptionId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.subscriptionId !== subscriptionId) {
              return new Response(undefined, { status: 400 });
            }

            return Response.json(subscription);
          }
        )
      );
    });

    test('should refresh the subscription when the token is valid', async () => {
      await expect(
        refreshSubscription({ token: validToken, subscriptionId })
      ).resolves.toStrictEqual(subscription);
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        refreshSubscription({ token: invalidToken, subscriptionId })
      ).rejects.toThrowError();
    });
  });

  describe('removeSubscription', () => {
    beforeEach(() => {
      server.use(
        http.delete(
          `${env.MICROSOFT_API_URL}/subscriptions/:subscriptionId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.subscriptionId !== subscriptionId) {
              return new Response(undefined, { status: 400 });
            }

            return new Response();
          }
        )
      );
    });

    test('should remove the subscription when the token is valid', async () => {
      await expect(
        removeSubscription({ token: validToken, subscriptionId })
      ).resolves.toBeUndefined();
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        removeSubscription({ token: invalidToken, subscriptionId })
      ).rejects.toThrowError();
    });
  });
});
