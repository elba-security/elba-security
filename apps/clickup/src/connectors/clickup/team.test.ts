import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { ClickUpError } from '../commons/error';
import { type ClickUpTeam } from '../types';
import { getTeamIds } from './team';

const validToken = 'valid-token';
const teamIds = ['test-id'];
const teams: ClickUpTeam[] = [{ id: 'test-id', name: 'team-name' }];

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
    const result = await getTeamIds(validToken);
    expect(result).toEqual(teamIds);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getTeamIds('invalidToken')).rejects.toThrowError(ClickUpError);
  });
});
