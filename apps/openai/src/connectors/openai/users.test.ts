/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenience */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenience */
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { users } from '@/inngest/functions/users/__mocks__/integration';
import { deleteUser, getUsers } from './users';
import { OpenAiError } from './common/error';

const apiKey = 'valid-api-key';
const organizationId = 'valid-organization-id';
const userId = 'test-user-id';

describe('getOpenAiUsers', () => {
  beforeEach(() => {
    server.use(
      http.get<{ organizationId: string }>(
        `https://api.openai.com/v1/organizations/:organizationId/users`,
        ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.organizationId !== organizationId) {
            return new Response(undefined, { status: 404 });
          }
          return Response.json({ members: { data: users } });
        }
      )
    );
  });

  test('should fetch users when apiKey and organizationId are valid', async () => {
    const result = await getUsers({ apiKey, organizationId });
    expect(result.users).toEqual(users);
  });

  test('should throws when apiKey is invalid', async () => {
    await expect(getUsers({ apiKey: 'wrong-api-key', organizationId })).rejects.toBeInstanceOf(
      OpenAiError
    );
  });

  test('should throws when organizationId is invalid', async () => {
    await expect(
      getUsers({ apiKey, organizationId: 'wron-organization-id' })
    ).rejects.toBeInstanceOf(OpenAiError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ organizationId: string; userId: string }>(
        `https://api.openai.com/v1/organizations/:organizationId/users/:userId`,
        ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.organizationId !== organizationId || params.userId !== userId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user when it does exist', async () => {
    await expect(deleteUser({ apiKey, organizationId, userId })).resolves.toBe(undefined);
  });

  test('should not throw when it does not exist', async () => {
    await expect(deleteUser({ apiKey, organizationId, userId: 'wrong-user-id' })).resolves.toBe(
      undefined
    );
  });

  test('should throws when apiKey is invalid', async () => {
    await expect(
      deleteUser({ apiKey: 'wrong-api-key', organizationId, userId })
    ).rejects.toBeInstanceOf(OpenAiError);
  });
});
