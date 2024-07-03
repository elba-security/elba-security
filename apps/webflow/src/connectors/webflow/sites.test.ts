import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { WebflowError } from '../commons/error';
import { getSiteIds } from './sites';

const validToken = 'valid-token';
const siteIds = ['test-id'];

export const sites = [
  {
    id: 'test-id',
    displayName: 'site-name',
  },
];

describe('getSiteId', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.webflow.com/v2/sites', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ sites }), { status: 200 });
      })
    );
  });

  test('should not throw when token is valid', async () => {
    await expect(getSiteIds(validToken)).resolves.toEqual(siteIds);
  });

  test('should throw an error when token is invalid', async () => {
    await expect(getSiteIds('invalid-token')).rejects.toBeInstanceOf(WebflowError);
  });
});
