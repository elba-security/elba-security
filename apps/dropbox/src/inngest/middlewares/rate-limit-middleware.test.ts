import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { rateLimitMiddleware } from './rate-limit-middleware';
import { DropboxResponseError } from 'dropbox';

const RETRY_AFTER = '300';

describe('rate-limit middleware', () => {
  test('should not transform the output when there are no errors', () => {
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

  test('should not transform the output when the error is not about Dropbox rate limit', () => {
    const generalError = new DropboxResponseError(
      403,
      {},
      {
        error_summary: 'other/...',
        error: {
          '.tag': 'other',
        },
      }
    );

    expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {
            error: generalError,
          },
        })
    ).toBeUndefined();
  });

  test('should transform the output error to RetryAfterError when the error is about Dropbox rate limit', () => {
    const rateLimitError = new DropboxResponseError(
      429,
      {},
      {
        error_summary: 'too_many_requests/...',
        error: {
          '.tag': 'too_many_requests',
          retry_after: RETRY_AFTER,
        },
      }
    );

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
    expect(result?.result.error.retryAfter).toStrictEqual(RETRY_AFTER);
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
