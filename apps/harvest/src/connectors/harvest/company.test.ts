import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { HarvestError } from '../common/error';
import { getCompanyDomain } from './company';

const validToken = 'token-1234';
const companyDomain = 'test-company-domain';

describe('company connector', () => {
  describe('getCompanyDomain', () => {
    beforeEach(() => {
      server.use(
        http.get<{ userId: string }>(`${env.HARVEST_API_BASE_URL}/company`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ full_domain: companyDomain });
        })
      );
    });

    test('should return company domain successfully when token is valid', async () => {
      await expect(getCompanyDomain(validToken)).resolves.not.toThrow();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(getCompanyDomain('invalidToken')).rejects.toBeInstanceOf(HarvestError);
    });
  });
});
