import { afterEach } from 'node:test';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { HubspotError } from '@/connectors/common/error';
import * as usersConnector from '@/connectors/hubspot/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango/api';
import { rateLimitMiddleware } from './rate-limit-middleware';

const region = 'us';
const accessToken = 'test-access-token';
const accountInfo = {
  timeZone: 'test-timezone',
  portalId: 1234,
  uiDomain: 'test-domain',
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region,
};

describe('rate-limit middleware', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2022-01-01T10:00:00Z'));
    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
        },
      }),
    };

    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(
      mockNangoAPIClient as unknown as typeof nangoAPI.nangoAPIClient
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should not transform the output when their is no error', async () => {
    expect(
      await rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {},
        })
    ).toBeUndefined();
  });

  test('should not transform the output when the error is not about Hubspot rate limit', async () => {
    expect(
      await rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {
            error: new Error('foo bar'),
          },
        })
    ).toBeUndefined();
  });

  test.each([
    {
      dailyRateLimitRemaining: '499855',
      rateLimitRemaining: '149',
      rateLimitInterval: '10000',
      retryAfter: '60',
    },
    {
      dailyRateLimitRemaining: '10000',
      rateLimitRemaining: '10',
      rateLimitInterval: '10000',
      retryAfter: '60',
    },
  ])(
    'should transform the output error to RetryAfterError when the error is about Hubspot rate limit',
    async ({ dailyRateLimitRemaining, rateLimitRemaining, rateLimitInterval, retryAfter }) => {
      vi.spyOn(usersConnector, 'getAccountInfo').mockResolvedValueOnce(accountInfo);

      await db.insert(organisationsTable).values(organisation);

      const rateLimitError = new HubspotError('foo bar', {
        // @ts-expect-error this is a mock
        response: {
          status: 429,
          headers: new Headers({
            'X-HubSpot-RateLimit-Remaining': rateLimitRemaining,
            'X-HubSpot-RateLimit-Interval-Milliseconds': rateLimitInterval,
            'X-HubSpot-RateLimit-Daily-Remaining': dailyRateLimitRemaining,
          }),
        },
      });

      const context = {
        foo: 'bar',
        baz: {
          biz: true,
        },
        result: {
          data: {
            organisationId: '00000000-0000-0000-0000-000000000001',
          },
          error: rateLimitError,
        },
      };

      const result = await rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput(context);
      expect(result?.result.error).toBeInstanceOf(RetryAfterError);
      expect(result?.result.error.retryAfter).toStrictEqual(retryAfter);
      expect(result).toMatchObject({
        foo: 'bar',
        baz: {
          biz: true,
        },
        result: {
          data: {
            organisationId: '00000000-0000-0000-0000-000000000001',
          },
        },
      });
    }
  );
});
