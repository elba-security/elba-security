import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { DropboxError } from '../common/error';
import { getToken } from './auth';

const validCode = '1234';
const token = 'token-1234';

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://mysaas.com/api/v1/token', async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as { code: string };
          if (!data.code || data.code !== validCode) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ token });
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toBe(token);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(DropboxError);
    });
  });
});
