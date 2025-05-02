import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '../../common/env';
import { ClickUpError } from '../common/error';
import { getTeamIds } from './teams';

const validToken = 'valid-token';

describe('getTeamIds', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.CLICKUP_API_BASE_URL}/team`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            teams: [
              {
                id: 'team-id',
              },
            ],
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should return the authorized team id', async () => {
    const result = await getTeamIds(validToken);
    expect(result).toEqual([{ id: 'team-id' }]);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getTeamIds('invalidToken')).rejects.toThrowError(ClickUpError);
  });
});
