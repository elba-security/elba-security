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
import { type SmartSheetUser, getUsers, type GetUsersResponseData } from './users';
import { SmartSheetError } from './commons/error';

const validToken = 'valid_access_token';
const endPage = 2;

const users: SmartSheetUser[] = Array.from({ length: 5 }, (_, i) => ({
  email: `username-${i}@foo.bar`,
  name: `first-name_last-name-${i}`,
  firstName: `first-name-${i}`,
  lastName: `last-name-${i}`,
  admin: true,
  licensedSheetCreator: true,
  groupAdmin: false,
  resourceViewer: true,
  id: `id-${i}`,
  status: 'ACTIVE',
  sheetCount: 1,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    // Mock response data when there is another page
    const usersDataWithFirstPage: GetUsersResponseData = {
      data: users,
      pageNumber: 1,
      totalPages: 2,
    };

    const usersDataWithSecondPage: GetUsersResponseData = {
      data: users,
      pageNumber: 2,
      totalPages: 2,
    };

    beforeEach(() => {
      server.use(
        http.get(`${env.SMART_SHEET_API_URL}users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const pageNumber = Number(new URL(request.url).searchParams.get('page'));

          if (pageNumber === 1) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json(usersDataWithFirstPage);
          } else if (pageNumber === 2) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json(usersDataWithSecondPage);
          }
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken, 1)).resolves.toStrictEqual({
        nextPage: endPage,
        users,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken, endPage)).resolves.toStrictEqual({
        nextPage: null,
        users,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar', 1)).rejects.toBeInstanceOf(SmartSheetError);
    });
  });
});
