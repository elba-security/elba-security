import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import type { ClickUpError } from '@/connectors/commons/error';
import { server } from '../../vitest/setup-msw-handlers';
import { getTeamId } from './team';


const validToken = 'valid-token';
const teamId = 'team-id';
const teams= 'test-team';

describe('getTeamId', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.clickup.com/api/v2/team', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ teams }), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    try {
      const result = await getTeamId(validToken);
      expect(result).toEqual(teamId);
    } catch (error) {
      expect(error).toBeNull;
    }
  });

  test('should throw an error when token is invalid', async () => {
    try {
      await getTeamId('invalid-token');
    } catch (error) {
      expect((error as ClickUpError).message).toBe('Failed to fetch');
    }
  });
});
