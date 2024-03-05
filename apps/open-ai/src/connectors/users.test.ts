import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { users } from '@/inngest/functions/users/__mocks__/integration';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers } from './users';
import type { OpenAiError } from './commons/error';

const validToken = env.OPENAI_API_TOKEN;
const sourceOrganizationId = env.OPENAI_ORGANIZATION_ID;

describe('getOpenAiUsers', () => {
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
              members: { data: users },
            }),
            { status: 200 }
          );
        }
      )
    );
  });

  test('should fetch OpenAI users when token is valid', async () => {
    const result = await getUsers(validToken, env.OPENAI_ORGANIZATION_ID);
    expect(result.users).toEqual(users);
  });

  test('should throw OpenAiError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', env.OPENAI_ORGANIZATION_ID);
    } catch (error) {
      const openAiError = error as OpenAiError;
      expect(openAiError.message).toEqual('Could not retrieve users');
    }
  });
});
