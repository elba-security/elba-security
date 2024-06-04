import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { IntercomError } from '@/connectors/common/error';
import { rateLimitMiddleware } from './rate-limit-middleware';

const rateLimitReset = '1487332520';
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

  test('should not transform the output when the error is not about Intercom rate limit', () => {
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

  test('should transform the output error to RetryAfterError when the error is about Intercom rate limit', () => {
    const rateLimitError = new IntercomError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitReset,
        }),
      },
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
      String(Number(rateLimitReset) - Math.floor(Date.now() / 1000))
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
