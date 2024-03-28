import { fail } from 'node:assert';
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { type HerokuError } from './commons/error';
import { getTeamId } from './teams';
import { teams } from './__mocks__/fetch-teams';

const validToken = 'valid-token';
const teamId = 'team-id';

describe('getTeamId', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.heroku.com/enterprise-accounts', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify(teams), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    try {
      const result = await getTeamId(validToken);
      expect(result).toEqual(teamId);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when token is invalid', async () => {
    try {
      await getTeamId('invalid-token');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as HerokuError).message).toBe('Failed to fetch');
    }
  });
});
