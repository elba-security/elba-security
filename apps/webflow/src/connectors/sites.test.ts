import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { type WebflowError } from './commons/error';
import { getSiteId } from './sites';
import { sites } from './__mocks__/sites';

const validToken = 'valid-token';
const siteId = 'site-id';

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
    try {
      const result = await getSiteId(validToken);
      expect(result).toEqual(siteId);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when token is invalid', async () => {
    try {
      await getSiteId('invalid-token');
    } catch (error) {
      expect((error as WebflowError).message).toBe('Failed to fetch');
    }
  });
});
