import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BrevoError } from '../common/error';
import { type BrevoUser, getUsers } from './users';

const validApiKey = 'test-api-key';
const invalidApiKey = 'foo-bar';

const validUsers: BrevoUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  status: `active`,
  email: `user-${i}@foo.bar`,
  is_owner: false,
}));

const invalidUsers = [];

describe('getBrevoUsers', () => {
  beforeEach(() => {
    const resolver: ResponseResolver = ({ request }) => {
      if (request.headers.get('api-key') !== validApiKey) {
        return new Response(undefined, { status: 401 });
      }

      const returnData = {
        users: validUsers,
      };

      return Response.json(returnData);
    };
    server.use(http.get(`${env.BREVO_API_BASE_URL}/organization/invited/users`, resolver));
  });

  test('should return all users when the apiKey is valid', async () => {
    await expect(getUsers(validApiKey)).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
    });
  });

  test('should throws when the api key is invalid', async () => {
    await expect(getUsers(invalidApiKey)).rejects.toBeInstanceOf(BrevoError);
  });
});
