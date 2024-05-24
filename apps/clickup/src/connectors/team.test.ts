import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../env';
import { getTeamId } from './team';
import { ClickUpError } from './commons/error';
import { ClickUpTeam } from './types';

const validToken = 'valid-token';
const teamId = 'team-id';
const teams: ClickUpTeam[] = [{ id: teamId, name: 'team-name' }];

describe('getTeamId', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.CLICKUP_API_BASE_URL}/team`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ teams }), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    const result = await getTeamId(validToken);
    expect(result).toEqual(teamId);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getTeamId('invalidToken')).rejects.toThrowError(ClickUpError);
  });
});
