import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { ServiceError } from '@/connectors/common/error';
import { rateLimitMiddleware } from './rate-limit-middleware';

describe('rate-limit middleware', () => {
  test('should not transform the output when there is no error', () => {
    expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'test-fn' } })
        .transformOutput({
          result: {},
        })
    ).toBeUndefined();
  });

  test('should not transform the output when the error is not a rate limit error', () => {
    expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'test-fn' } })
        .transformOutput({
          result: {
            error: new Error('generic error'),
          },
        })
    ).toBeUndefined();
  });

  test('should transform the output error to RetryAfterError when the error is a rate limit error', () => {
    const rateLimitError = new ServiceError('rate limit exceeded', {
      response: new Response(null, {
        status: 429,
        headers: new Headers({ 'retry-after': '10' }),
      }),
    });

    const context = {
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'test-data',
        error: rateLimitError,
      },
    };

    const result = rateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test-fn' } })
      .transformOutput(context);

    expect(result?.result.error).toBeInstanceOf(RetryAfterError);
    expect((result?.result.error as RetryAfterError).retryAfter).toBe('10s');
    expect(result).toMatchObject({
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'test-data',
      },
    });
  });

  test('should use default retry after when header is missing', () => {
    const rateLimitError = new ServiceError('rate limit exceeded', {
      response: new Response(null, { status: 429 }),
    });

    const result = rateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test-fn' } })
      .transformOutput({
        result: { error: rateLimitError },
      });

    expect(result?.result.error).toBeInstanceOf(RetryAfterError);
    expect((result?.result.error as RetryAfterError).retryAfter).toBe('60s');
  });
});
