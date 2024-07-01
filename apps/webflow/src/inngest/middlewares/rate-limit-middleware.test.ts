import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { WebflowError } from '@/connectors/commons/error';
import { rateLimitMiddleware } from './rate-limit-middleware';

describe('rate-limit middleware', () => {
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

  test('should not transform the output when the error is not about Webflow rate limit', () => {
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

  test('should transform the output error to RetryAfterError when the error is about Webflow rate limit', () => {
    const rateLimitError = new WebflowError('foo bar', {
      response: {
        // @ts-expect-error -- this is a mock
        headers: { 'X-RateLimit-Remaining': '0' },
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
