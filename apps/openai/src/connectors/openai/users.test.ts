import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { OpenAiError } from '../common/error';
import type { OpenAiUser } from './users';
import { deleteUser, getUsers, getTokenOwnerInfo } from './users';

const apiKey = 'valid-api-key';
const organizationId = 'valid-organization-id';
const userId = 'test-user-id';

export const users: OpenAiUser[] = Array.from({ length: 10 }, (_, i) => ({
  object: 'organization.user',
  role: 'admin',
  id: `userId-${i}`,
  name: `username-${i}`,
  email: `username-${i}@foo.bar`,
}));

describe('getOpenAiUsers', () => {
  beforeEach(() => {
    server.use(
      http.get<{ organizationId: string }>(
        `https://api.openai.com/v1/organization/users`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: users,
            has_more: true,
            last_id: 'last_id',
          });
        }
      )
    );
  });

  test('should fetch users when apiKey', async () => {
    const result = await getUsers({ apiKey });
    expect(result.validUsers).toEqual(users);
  });

  test('should throws when apiKey is invalid', async () => {
    await expect(getUsers({ apiKey: 'wrong-api-key' })).rejects.toBeInstanceOf(OpenAiError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ organizationId: string; userId: string }>(
        `https://api.openai.com/v1/organization/users/:userId`,
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
    await expect(deleteUser({ apiKey, userId })).resolves.toBe(undefined);
  });

  test('should not throw when it does not exist', async () => {
    await expect(deleteUser({ apiKey, userId: 'wrong-user-id' })).resolves.toBe(undefined);
  });

  test('should throws when apiKey is invalid', async () => {
    await expect(deleteUser({ apiKey: 'wrong-api-key', userId })).rejects.toBeInstanceOf(
      OpenAiError
    );
  });
});

describe('getTokenOwnerInfo', () => {
  beforeEach(() => {
    server.use(
      http.get<{ organizationId: string }>(`${env.OPENAI_API_BASE_URL}/me`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        return Response.json({
          id: 'test-id',
          orgs: {
            data: [
              {
                personal: false,
                id: 'test-org-id',
                role: 'owner',
              },
            ],
          },
        });
      })
    );
  });

  test('should fetch users when apiKey', async () => {
    const result = await getTokenOwnerInfo(apiKey);
    expect(result.userId).toEqual('test-id');
  });

  test('should throws when apiKey is invalid', async () => {
    await expect(getTokenOwnerInfo('wrong-api-key')).rejects.toBeInstanceOf(OpenAiError);
  });
});
