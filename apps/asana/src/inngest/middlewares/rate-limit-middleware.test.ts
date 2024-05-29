import { describe, expect, test } from 'vitest';
import { RetryAfterError } from 'inngest';
import { AsanaError } from '@/connectors/common/error';
import { rateLimitMiddleware } from './rate-limit-middleware';

describe('rate-limit middleware', () => {
  test('should not transform the output when their is no error', async () => {
    await expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {},
        })
    ).resolves.toBeUndefined();
  });

  test('should not transform the output when the error is not about asana rate limit', async () => {
    await expect(
      rateLimitMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' } })
        .transformOutput({
          result: {
            error: new Error('foo bar'),
          },
        })
    ).resolves.toBeUndefined();
  });

  test('should transform the output error to RetryAfterError when the error is about asana rate limit', async () => {
    const rateLimitError = new AsanaError('foo bar', {
      response: new Response(
        '{"errors":[{"message":"Rate limit exceeded","extensions":{"code":"RATELIMITED"}}]}',
        {
          headers: new Headers({ 'Retry-After': '10' }),
        }
      ),
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

    const result = await rateLimitMiddleware
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
