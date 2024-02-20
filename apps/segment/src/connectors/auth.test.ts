import { fail } from 'node:assert';
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { validateToken } from './auth';

const validToken = env.SEGMENT_API_TOKEN;

describe('validateToken', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.segmentapis.com/echo', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response();
      })
    );
  });

  test('should not throw when token is valid', async () => {
    try {
      await validateToken(validToken);
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when token is invalid', async () => {
    try {
      await validateToken('invalidToken');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as Error).message).toBe('Could not validate token');
    }
  });
});
