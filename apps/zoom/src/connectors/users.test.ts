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
import { getUsers, type GetUsersResponseData, type MySaasUser } from './users';
import { MySaasError } from './commons/error';

const validAccessToken = 'valid_access_token';

const users: MySaasUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  pmi: `pmi-${i}`,
  last_name: `last-name-${i}`,
  first_name: `first-name-${i}`,
  email: `username-${i}@foo.bar`,
  display_name: `first-name_last-name-${i}`,
  phone_number: '9967834639',
  role_id: i,
}));

const newPageToken: string | null = 'some_next_page_token';

describe('user connector', () => {
  describe('getUsers', () => {
    // Mock response data when there is another page
    const usersDataWithNextPage: GetUsersResponseData = {
      users,
      page_number: 1,
      page_size: 1,
      total_record: 5,
      next_page_token: newPageToken,
    };

    // Mock response data when there is no other page (last page)
    const usersDataLastPage: GetUsersResponseData = {
      users,
      page_number: 1,
      page_size: 1,
      total_record: 5,
      next_page_token: null,
    };

    beforeEach(() => {
      /* eslint-disable -- no type here */
      server.use(
        http.get(`${env.ZOOM_API_URL}/users`, ({ request }) => {
          const accessToken = request.headers.get('Authorization')?.split(' ')[1];
          // Extracting the 'workspace' query parameter
          const url = new URL(request.url);
          const nextPage = url.searchParams.get('next_page_token');

          if (accessToken !== validAccessToken) {
            return Response.json({ status: 401 });
          }
          if (!nextPage) {
            return Response.json(usersDataLastPage);
          }
          return Response.json(usersDataWithNextPage);
        })
      );
    });

    // / eslint-enable -- no type here /;
    test('should return users and nextPage when the token is valid and there is another page', async () => {
      await expect(getUsers(validAccessToken, newPageToken)).resolves.toStrictEqual(
        usersDataWithNextPage
      );
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validAccessToken, null)).resolves.toStrictEqual(
        usersDataLastPage
        // offset: null, // Assuming the absence of next_page implies no more pages
      );
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('invalid_access_token', 'invalid-token')).rejects.toBeInstanceOf(
        MySaasError
      );
    });
  });
});
