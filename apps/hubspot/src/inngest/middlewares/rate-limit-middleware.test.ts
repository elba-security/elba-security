import { afterEach } from 'node:test';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { HubspotError } from '@/connectors/hubspot/common/error';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { rateLimitMiddleware } from './rate-limit-middleware';

const accessToken = 'some token';
const refreshToken = 'some refresh token';
const region = 'us';
const timeZone = 'us/eastern';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '10001',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  region,
  timeZone,
  domain: 'foo-bar.hubspot.com',
  portalId: 12345,
};

describe('rate-limit middleware', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2022-01-01T10:00:00Z'));
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
      dailyRateLimitRemaining: '0',
      rateLimitRemaining: '0',
      rateLimitInterval: '10000',
      retryAfter: '68400',
    },
  ])(
    'should transform the output error to RetryAfterError when the error is about Hubspot rate limit',
    async ({ dailyRateLimitRemaining, rateLimitRemaining, rateLimitInterval, retryAfter }) => {
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
