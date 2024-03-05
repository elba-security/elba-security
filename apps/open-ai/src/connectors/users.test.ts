import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers } from './users';
import type { OpenAiError } from './commons/error';

const usersResponse = Array.from({ length: 10 }, (_, i) => ({
  role: 'admin',
  user: { id: `userId-${i}`, name: `username-${i}`, email: `username-${i}@foo.bar` },
}));

const OpenAiUsers = Array.from({ length: 10 }, (_, i) => ({
  id: `userId-${i}`,
  username: `username-${i}`,
  role: 'admin',
  email: `username-${i}@foo.bar`,
}));

const validToken = env.OPENAI_API_TOKEN;
const sourceOrganizationId = env.OPENAI_ORGANIZATION_ID;

describe('getSendGridUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `https://api.openai.com/v1/organizations/${sourceOrganizationId}/users`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(
            JSON.stringify({
              members: { data: usersResponse },
            }),
            { status: 200 }
          );
        }
      )
    );
  });

  test('should fetch SendGrid users when token is valid', async () => {
    const result = await getUsers(validToken, env.OPENAI_ORGANIZATION_ID);
    expect(result.users).toEqual(OpenAiUsers);
  });

  test('should throw SendgridError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', env.OPENAI_ORGANIZATION_ID);
    } catch (error) {
      const openAiError = error as OpenAiError;
      expect(openAiError.message).toEqual('Could not retrieve users');
    }
  });
});
