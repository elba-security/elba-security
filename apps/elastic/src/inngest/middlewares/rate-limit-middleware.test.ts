import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { ElasticError } from '@/connectors/common/error';
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

  test('should not transform the output when the error is not about elastic rate limit', () => {
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

  test('should transform the output error to RetryAfterError when the error is about elastic rate limit', () => {
    const rateLimitError = new ElasticError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'X-RateLimit-Reset': 'Wed, 31 Jul 2100 12:00:00 GMT' }),
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

    // Calculate the expected retryAfter value
    const resetDate = new Date('Wed, 31 Jul 2100 12:00:00 GMT');
    const currentTime = new Date();
    const expectedRetryAfter = Math.max(
      0,
      Math.floor((resetDate.getTime() - currentTime.getTime()) / 1000)
    );

    expect(result?.result.error.retryAfter).toStrictEqual(`${expectedRetryAfter}`);
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
