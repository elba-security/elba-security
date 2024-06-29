import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { HerokuError } from '@/connectors/commons/error';
import { rateLimitMiddleware } from './rate-limit-middleware';

const now = Date.now();
describe('rate-limit middleware', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not transform the output when their is no error', () => {
    expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {},
        })
    ).toBeUndefined();
  });

  test('should not transform the output when the error is not about Heroku rate limit', () => {
    expect(
      rateLimitMiddleware
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

  test('should transform the output error to RetryAfterError when the error is about Heroku rate limit', () => {
    const rateLimitError = new HerokuError('foo bar', {
      response: {
        // @ts-expect-error -- this is a mock
        headers: { 'RateLimit-Remaining': '0' },
      },
      // @ts-expect-error -- this is a mock
      request: { method: 'GET', url: 'http://foo.bar', headers: {} },
    });

    const context = {
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
        error: rateLimitError,
      },
    };

    const result = rateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'foo' } })
      .transformOutput(context);
    expect(result?.result.error).toBeInstanceOf(RetryAfterError);
    const expectedRetryAfter = new Date();
    expectedRetryAfter.setMinutes(expectedRetryAfter.getMinutes() + 1);
    expect(result?.result.error.retryAfter).toEqual(expectedRetryAfter.toISOString());
    expect(result).toMatchObject({
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
      },
    });
  });
});
