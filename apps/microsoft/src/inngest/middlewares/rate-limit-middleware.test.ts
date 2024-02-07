import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { MicrosoftError } from '@/connectors/microsoft/commons/error';
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

  test('should not transform the output when the error is not about microsoft rate limit', () => {
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

  test('should transform the output error to RetryAfterError when the error is about microsoft rate limit', () => {
    const rateLimitError = new MicrosoftError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'Retry-After': '10' }),
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
    expect(result?.result.error.retryAfter).toStrictEqual('10');
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
