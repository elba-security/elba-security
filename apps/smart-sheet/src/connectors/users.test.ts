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

const validAccessToken = 'valid_access_token';

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

describe('user connector', () => {
  describe('getUsers', () => {
    // Mock response data when there is another page
    const usersDataWithFirstPage: GetUsersResponseData = {
      data: users,
      pageNumber: 1,
      pageSize: 5,
      totalCount: 10,
      totalPages: 2,
    };

    const usersDataWithSecondPage: GetUsersResponseData = {
      data: users,
      pageNumber: 2,
      pageSize: 5,
      totalCount: 10,
      totalPages: 2,
    };

    beforeEach(() => {
      /* eslint-disable -- no type here */
      server.use(
        http.get(`${env.SMART_SHEET_API_URL}users`, ({ request }: any) => {
          const accessToken = request.headers.get('Authorization')?.split(' ')[1];
          const pageNumber = Number(new URL(request.url).searchParams.get('page'));

          if (accessToken !== validAccessToken) {
            return new Response(undefined, { status: 401 });
          }

          if (pageNumber === 1) {
            return Response.json(usersDataWithFirstPage);
          } else if (pageNumber === 2) {
            return Response.json(usersDataWithSecondPage);
          } else {
            return new Response(undefined, { status: 404 });
          }
        })
      );
    });

    test('should return users when the token is valid and their is another page', async () => {
      await expect(getUsers(validAccessToken, 1)).resolves.toStrictEqual(usersDataWithFirstPage);
    });

    test('should return users when the token is valid and their is no other page', async () => {
      await expect(getUsers(validAccessToken, 2)).resolves.toStrictEqual(usersDataWithSecondPage);
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('invalid_access_token', 1)).rejects.toBeInstanceOf(SmartSheetError);
    });
  });
});
