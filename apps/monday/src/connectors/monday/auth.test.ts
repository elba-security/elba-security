/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MondayError } from '../common/error';
import { getToken, getWorkspaceIds } from './auth';

const validCode = '1234';
const invalidCode = 'invalid-code';
const accessToken = 'access-token-1234';
const invalidToken = 'invalid-token';
const workspaceId = '000000';

type RequestBodyType = {
  client_id: string;
  client_secret: string;
  code: string;
}

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.MONDAY_APP_INSTALL_URL}/token`, async ({ request }) => {
          const body = (await request.json()) as RequestBodyType;
          const { code } = body;
          if (code !== validCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ access_token: accessToken });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken(invalidCode)).rejects.toBeInstanceOf(MondayError);
    });
  });

  describe('getWorkspaceIds', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.MONDAY_API_BASE_URL}`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: {
              boards: [
                {
                  workspace_id: workspaceId,
                  workspace: {
                    is_default_workspace: true,
                  },
                },
              ],
            },
          });
        })
      );
    });

    test('should return the workspaceIds when the accessToken is valid', async () => {
      await expect(getWorkspaceIds(accessToken)).resolves.toStrictEqual([workspaceId]);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getWorkspaceIds(invalidToken)).rejects.toBeInstanceOf(MondayError);
    });
  });
});
