import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { MakeError } from '../common/error';
import { getOrganizations } from './organizations';

const validToken = 'valid-token';
const zoneDomain = 'eu2.make.com';
const organizations = { organizations: [{ id: 100000, name: 'test-name', zone: 'test-zone' }] };

describe('getOrganizations', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${zoneDomain}/api/v2/organizations`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Token ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json(organizations);
      })
    );
  });

  test('should not throw when token is valid', async () => {
    const result = await getOrganizations({ apiToken: validToken, zoneDomain });
    expect(result).toEqual(organizations);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getOrganizations({ apiToken: 'invalidToken', zoneDomain })).rejects.toThrowError(
      MakeError
    );
  });
});
