import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { AirslateError } from '../common/error';
import { getWorkspaces } from './workspaces';

const validToken = 'valid-token';
const workspaceResponseData = [
  {
    id: 'test-id',
    subdomain: 'test-subdomain',
  },
];
describe('getWorkspaces', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.AIRSLATE_API_BASE_URL}/organizations`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json({
          data: workspaceResponseData,
        });
      })
    );
  });

  test('should return the authorized team id', async () => {
    const result = await getWorkspaces(validToken);
    expect(result).toEqual(workspaceResponseData);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getWorkspaces('invalidToken')).rejects.toThrowError(AirslateError);
  });
});
