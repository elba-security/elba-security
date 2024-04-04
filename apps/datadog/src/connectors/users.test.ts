/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { DatadogError } from './commons/error';
import { getUsers, type DatadogUser } from './users';

const validApiKey = 'valid_api_key';
const validAppKey = 'valid_app_key';

const users: DatadogUser[] = Array.from({ length: 5 }, (_, i) => ({
  type: 'users',
  id: `e241eefd-e1f5-11ee-8b5a-ce9410b1f${i}ca`,
  attributes: {
    name: `first-name_last-name-${i}`,
    handle: `test${i}@gmail.com`,
    created_at: '2024-03-14T11:27:47.427328+00:00',
    modified_at: '2024-03-26T08:22:37.678887+00:00',
    email: `username-${i}@foo.bar`,
    icon: 'https://www.test.com',
    title: 'test-title',
    verified: true,
    service_account: false,
    disabled: false,
    allowed_login_methods: [],
    status: 'Active',
    mfa_enabled: false,
  },
}));

describe('users connector', () => {
  describe('getUsers', () => {
    const usersData: DatadogUser[] = users;

    beforeEach(() => {
      server.use(
        http.get('https://api.datadoghq.com/api/v2/users', ({ request }) => {
          if (
            request.headers.get('DD-API-KEY') !== validApiKey ||
            request.headers.get('DD-APPLICATION-KEY') !== validAppKey
          ) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(JSON.stringify({ data: usersData }), { status: 200 });
        })
      );
    });

    test('should return users when the API key and Application key is valid', async () => {
      await expect(getUsers(validAppKey, validApiKey)).resolves.toStrictEqual(usersData);
    });

    test('should throws when the API key and Application key is invalid', async () => {
      await expect(getUsers('foo-bar-app', 'foo-bar-api')).rejects.toBeInstanceOf(DatadogError);
    });
  });
});
