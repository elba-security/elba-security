import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { addDays } from 'date-fns';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { encrypt } from '@/common/crypto';
import {
  createSubscription,
  refreshSubscription,
  removeSubscription,
  type Subscription,
} from './subscriptions';

const validToken = 'token-1234';
const changeType = 'updated';
const resource = `sites/siteId/drives/driveId/root`;
const encryptedToken = await encrypt(validToken);
const invalidToken = 'invalid-token';
const subscriptionId = 'subscription-id';
const clientState = 'some-client-state';

const subscription: Subscription = {
  id: 'subscription-id',
  clientState,
  expirationDateTime: addDays(new Date(), Number(env.SUBSCRIBE_EXPIRATION_DAYS)).toISOString(),
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
      await expect(refreshSubscription(encryptedToken, subscriptionId)).resolves.toStrictEqual(
        subscription
      );
    });

    test('should throw when the token is invalid', async () => {
      await expect(refreshSubscription(invalidToken, subscriptionId)).rejects.toThrowError();
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

            return undefined;
          }
        )
      );
    });

    test('should refresh the subscription when the token is valid', async () => {
      await expect(removeSubscription(encryptedToken, subscriptionId)).resolves.toBeUndefined();
    });

    test('should throw when the token is invalid', async () => {
      await expect(removeSubscription(invalidToken, subscriptionId)).rejects.toThrowError();
    });
  });
});
