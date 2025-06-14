import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';
import { getOrganization } from './organizations';

const validToken = 'token-1234';
const organizationSlug = 'test-org';

describe('organizations connector', () => {
  describe('getOrganization', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.SENTRY_API_BASE_URL}/organizations/`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const responseData = [
            {
              slug: organizationSlug,
              name: 'Test Organization',
            },
          ];

          return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        })
      );
    });

    test('should return organization when token is valid', async () => {
      await expect(getOrganization(validToken)).resolves.toStrictEqual({
        slug: organizationSlug,
        name: 'Test Organization',
      });
    });

    test('should throw IntegrationConnectionError when token is invalid', async () => {
      await expect(getOrganization('invalid-token')).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });
  });
});
