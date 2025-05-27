/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { ConfluenceError } from '../common/error';
import { checkAdmin, getInstance } from './auth';

const oauthToken = {
  access_token: 'access-token',
  token_type: 'foobar',
  expires_in: 3600,
  refresh_token: 'refresh-token',
};

const users = Array.from({ length: 5 }, (_, i) => ({
  operations:
    i === 0
      ? [
          {
            operation: 'administer',
            targetType: 'application',
          },
        ]
      : [],
}));

const instances = Array.from({ length: 5 }, (_, i) => ({
  id: `instances-${i}`,
  url: `https://foo-${i}.confluence.com`,
}));

describe('auth connector', () => {
  describe('getInstance', () => {
    beforeEach(() => {
      server.use(
        http.get('https://api.atlassian.com/oauth/token/accessible-resources', ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${oauthToken.access_token}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json(instances);
        })
      );
    });

    test('should return the first instance', async () => {
      await expect(getInstance(oauthToken.access_token)).resolves.toStrictEqual(instances[0]);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getInstance('wrong-access-token')).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('checkAdmin', () => {
    beforeEach(() => {
      server.use(
        http.get<{ instanceId: string }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/user/current',
          ({ request, params }) => {
            const index = instances.findIndex(({ id }) => id === params.instanceId);
            const user = users[index];
            if (
              !user ||
              request.headers.get('Authorization') !== `Bearer ${oauthToken.access_token}`
            ) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json(user);
          }
        )
      );
    });

    test('should return true when the user is an admin of the instance', async () => {
      await expect(
        checkAdmin({ accessToken: oauthToken.access_token, instanceId: instances[0]!.id })
      ).resolves.toBe(true);
    });

    test('should return false when the user is not an admin of the instance', async () => {
      await expect(
        checkAdmin({ accessToken: oauthToken.access_token, instanceId: instances[1]!.id })
      ).resolves.toBe(false);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(
        checkAdmin({ accessToken: 'wrong-access-token', instanceId: instances[1]!.id })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
