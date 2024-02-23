import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../../vitest/setup-msw-handlers';
import { BitbucketError } from '../commons/error';
import { getWorkspace } from './workspace';

const accessToken = 'token-1234';

describe('workspace connector', () => {
  describe('getWorkspace', () => {
    beforeEach(() => {
      server.use(
        http.get('https://api.bitbucket.org/2.0/workspaces', ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
          return Response.json({
            values: [
              {
                uuid: 'workspace-uuid',
              },
            ],
            pagelen: 1,
            page: 1,
            size: 1,
          });
        })
      );
    });
    test('should return the workspace when the token is valid', async () => {
      await expect(getWorkspace(accessToken)).resolves.toStrictEqual({
        uuid: 'workspace-uuid',
      });
    });
    test('should throw when the token is invalid', async () => {
      await expect(getWorkspace('invalid-token')).rejects.toBeInstanceOf(BitbucketError);
    });
  });
});
