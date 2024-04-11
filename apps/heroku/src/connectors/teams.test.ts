/* eslint-disable @typescript-eslint/no-unsafe-return -- convenience */
/* eslint-disable @typescript-eslint/no-unsafe-call -- convenience */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { HerokuError } from './commons/error';
import { getTeams } from './teams';

const validToken = 'valid-token';
const nextRange = 'next-range';
const lastRange = 'last-range';

const teams = Array.from({ length: 20 }, (_, i) => ({
  id: `team-${i}`,
}));

describe('getTeams', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.heroku.com/teams', ({ request }) => {
        const url = new URL(request.url);
        const limit = url.searchParams.get('max') ?? 100;
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = teams.slice(0, Number(limit));
        if (request.headers.get('Range') === lastRange) {
          return Response.json(responseData);
        }
        return Response.json(responseData, { headers: { 'Next-Range': nextRange } });
      })
    );
  });

  test('should returns teams & nextCursor when their is other page', async () => {
    await expect(getTeams(validToken, null)).resolves.toMatchObject({
      nextCursor: nextRange,
      teams: teams.slice(0, 10),
    });
  });

  test('should returns teams & nextCursor=null when their is no other page', async () => {
    await expect(getTeams(validToken, lastRange)).resolves.toMatchObject({
      nextCursor: null,
      teams: teams.slice(0, 10),
    });
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getTeams('invalid-token', null)).rejects.toBeInstanceOf(HerokuError);
  });
});
