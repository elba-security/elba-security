/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { HubspotError } from './commons/error';
import { getAccountDetails } from './account-info';

const validToken = 'token-1234';
const timeZone = "us/eastern";

describe('account-info connector', () => {
  describe('getAccountDetails', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}account-info/v3/details`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ timeZone });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
        await expect(getAccountDetails(validToken)).resolves.toStrictEqual(timeZone);
      });
  
    test('should throw when the code is invalid', async () => {
    await expect(getAccountDetails('wrong-code')).rejects.toBeInstanceOf(HubspotError);
    });

  });
});
