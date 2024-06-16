import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { MakeError } from '../commons/error';
import { getOrganizationIds } from './organizations';

const validToken = 'valid-token';
const organizationIds = ['test-id'];
const zoneDomain = 'eu2.make.com';
const organizations = { entities: [{ id: 'test-id', name: 'test-name' }] };

describe('getOrganizationIds', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${zoneDomain}/api/v2/organizations?zone=${zoneDomain}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Token ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify(organizations), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    const result = await getOrganizationIds(validToken, zoneDomain);
    expect(result).toEqual(organizationIds);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getOrganizationIds('invalidToken', zoneDomain)).rejects.toThrowError(MakeError);
  });
});
