import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import {z} from 'zod'
import { ClickUpError } from '../commons/error';
import { ClickUpTeamSchema, getTeamIds } from './team';

const validToken = 'valid-token';
const teamIds = ['test-id'];
const teams: z.infer<typeof ClickUpTeamSchema>[] = [{ id: 'test-id', name: 'team-name' }];

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
