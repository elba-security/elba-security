import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HubspotError } from './common/error';
import { getAccountInfo } from './account-info';

const validToken = 'token-1234';

const accountInfo = {
  timeZone: 'us/eastern',
  uiDomain: 'foo-bar.hubspot.com',
  portalId: 123413121,
};

describe('account-info connector', () => {
  describe('getAccountInfo', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json(accountInfo);
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getAccountInfo(validToken)).resolves.toStrictEqual(accountInfo);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getAccountInfo('wrong-code')).rejects.toBeInstanceOf(HubspotError);
    });
  });
});
