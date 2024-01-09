import { describe, expect, test } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { RetryAfterError } from 'inngest';
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

  test('should not transform the output when the error is not about github rate limit', () => {
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

  test('should transform the output error to RetryAfterError when the error is about github rate limit', () => {
    const rateLimitReset = '1700137003';
    const rateLimitError = new RequestError('foo bar', 429, {
      // @ts-expect-error this is a mock
      response: {
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': rateLimitReset },
      },
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
    expect(result?.result.error.retryAfter).toStrictEqual(
      new Date(Number(rateLimitReset) * 1000).toISOString()
    );
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
