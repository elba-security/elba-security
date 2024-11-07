import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { AzuredevopsError } from '../common/error';
import { getWorkspaces } from './workspaces';

const validToken = 'valid-token';
const workspaceResponseData = [
  {
    AccountName: 'test-name',
  },
];
describe('getWorkspaces', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.AZUREDEVOPS_APP_INSTALL_URL}/_apis/accounts`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json(workspaceResponseData);
      })
    );
  });

  test('should return the authorized team id', async () => {
    const result = await getWorkspaces(validToken);
    expect(result).toEqual(workspaceResponseData);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getWorkspaces('invalidToken')).rejects.toThrowError(AzuredevopsError);
  });
});
