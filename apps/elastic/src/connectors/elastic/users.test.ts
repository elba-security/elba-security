import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ElasticError } from '../common/error';
import type { ElasticUser } from './users';
import { getAllUsers, deleteUser } from './users';

const validApiKey = 'apiKey-1234';
const userId = 'test-id';
const organizationId = 'test-organization-id';

const validUsers: ElasticUser[] = Array.from({ length: 5 }, (_, i) => ({
  user_id: `user-id-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  role_assignments: {
    organization: [{ role_id: 'test-role-id' }],
    deployment: null,
  },
}));
const invalidUsers = [];

describe('users connector', () => {
  describe('getAllUsers', () => {
    // mock api key API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${validApiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json({ members: validUsers });
          }
        )
      );
    });

    test('should return users when the api key is valid ', async () => {
      await expect(getAllUsers({ apiKey: validApiKey, organizationId })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should return users when the api key is valid ', async () => {
      await expect(getAllUsers({ apiKey: validApiKey, organizationId })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should throws when the api key is invalid', async () => {
      await expect(getAllUsers({ apiKey: 'foo-bar', organizationId })).rejects.toBeInstanceOf(
        ElasticError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ organizationId: string; userId: string }>(
          `${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${validApiKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when api key is valid', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, userId, organizationId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, userId, organizationId })
      ).resolves.toBeUndefined();
    });

    test('should throw ElasticError when api key is invalid', async () => {
      await expect(
        deleteUser({ apiKey: 'invalidApiKey', userId, organizationId })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });
});
