/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HubspotError } from '../common/error';
import { getAccountTimezone } from './account-info';

const validToken = 'token-1234';
const timeZone = 'us/eastern';

describe('account-info connector', () => {
  describe('getAccountTimezone', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ timeZone });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getAccountTimezone(validToken)).resolves.toStrictEqual(timeZone);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getAccountTimezone('wrong-code')).rejects.toBeInstanceOf(HubspotError);
    });
  });
});
