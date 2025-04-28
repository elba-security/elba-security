import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';
import { getWorkspaceIds } from './workspaces';

const validToken = 'token-1234';

const workspaceId = '000000';
const invalidToken = 'invalid-token';

describe('getWorkspaceIds', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.ASANA_API_BASE_URL}/workspaces`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        return Response.json({
          data: [
            {
              gid: workspaceId,
            },
          ],
        });
      })
    );
  });

  test('should return the workspaceIds when the accessToken is valid', async () => {
    await expect(getWorkspaceIds(validToken)).resolves.toStrictEqual([workspaceId]);
  });

  test('should throw when the accessToken is invalid', async () => {
    await expect(getWorkspaceIds(invalidToken)).rejects.toBeInstanceOf(AsanaError);
  });
});
