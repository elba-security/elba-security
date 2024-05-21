import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import { getTeam, getTeams } from '@/connectors/microsoft/teams/teams';
import { encrypt } from '@/common/crypto';
import { MicrosoftError } from '../commons/error';

const validToken = 'token-1234';
const encryptedToken = await encrypt(validToken);
const invalidEncryptedToken = await encrypt('some-text');
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const invalidTeams = [{ visibility: 'public' }, { visibility: 'public' }];

const team: MicrosoftTeam = { id: 'team-id', displayName: 'team-name', visibility: 'public' };
function createValidArray() {
  const objectsArray: MicrosoftTeam[] = [];

  for (let i = 0; i < Number(env.TEAMS_SYNC_BATCH_SIZE) - invalidTeams.length; i++) {
    const obj: MicrosoftTeam = {
      id: `231-22414-34214536${i}`,
      displayName: `team-name-${i}`,
      visibility: i % 2 === 0 ? 'public' : 'private',
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validTeams: MicrosoftTeam[] = createValidArray();

const teams = [...validTeams, ...invalidTeams];

describe('teamsConnector', () => {
  describe('getTeams', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/teams`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);

          const select = url.searchParams.get('$select');
          const top = url.searchParams.get('$top');
          const skipToken = url.searchParams.get('$skiptoken');

          const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftTeam)[]);
          const formatedTeams = teams.map((user) =>
            selectedKeys.reduce<Partial<MicrosoftTeam>>((acc, key: keyof MicrosoftTeam) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
              acc[key] = user[key];
              return acc;
            }, {})
          );

          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

          return new Response(
            JSON.stringify({
              '@odata.nextLink':
                skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
              value: formatedTeams.slice(0, top ? Number(top) : 0),
            })
          );
        })
      );
    });

    test('should return teams and nextSkipToken when the token is valid and there is another page', async () => {
      await expect(
        getTeams({ token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        nextSkipToken,
        validTeams,
        invalidTeams,
      });
    });

    test('should return teams and no nextSkipToken when the token is valid and there is no other page', async () => {
      await expect(getTeams({ token: validToken, skipToken: endSkipToken })).resolves.toStrictEqual(
        {
          validTeams,
          invalidTeams,
          nextSkipToken: null,
        }
      );
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        getTeams({ token: 'invalid-token', skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getTeam', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/teams/:teamId`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          if (params.teamId !== team.id) {
            return new Response(JSON.stringify(null));
          }

          return new Response(JSON.stringify(team));
        })
      );
    });

    test('should return the team when the token and teamId are valid ', async () => {
      await expect(getTeam(encryptedToken, team.id)).resolves.toStrictEqual(team);
    });

    test('should throw when the token is invalid', async () => {
      await expect(getTeam(invalidEncryptedToken, team.id)).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should return null when the token is invalid, and team invalid', async () => {
      await expect(getTeam(encryptedToken, 'invalid-team-id')).resolves.toBeNull();
    });
  });
});
