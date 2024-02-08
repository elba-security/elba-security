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
import { type HubspotUser, getUsers, type Paging } from './users';
import { HubspotError } from './commons/error';

const validToken = 'token-1234';
const page = "some page";

const results: HubspotUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
}));

const paging: Paging = {
  next:{
    link:"some link",
    after: "some after"
  }
}
describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}crm/v3/owners`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const pageParam = url.searchParams.get('after');
          if (!pageParam) {
            return Response.json({ paging: null, results });
          }
          return Response.json({ paging, results });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken, page)).resolves.toStrictEqual({
        results,
        paging,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken, null)).resolves.toStrictEqual({
        results,
        paging: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar', page)).rejects.toBeInstanceOf(HubspotError);
    });
  });
});
