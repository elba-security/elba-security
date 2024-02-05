import { describe, expect, it } from 'vitest';
import { SlackAPIError } from 'slack-web-api-client';
import { RetryAfterError } from 'inngest';
import { slackRateLimitMiddleware } from './slack-rate-limit';

describe('slack-rate-limit inngest middleware', () => {
  it('Should not transform the output if there is no slack rate limit error', () => {
    const result = slackRateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test' } })
      .transformOutput({
        result: {},
      });

    expect(result).toBeUndefined();
  });

  it('should not transform the output when the error is not an slack rate limit one', () => {
    const result = slackRateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test' } })
      .transformOutput({
        result: {
          error: new Error('test'),
        },
      });

    expect(result).toBeUndefined();
  });

  it('Should transform the output if there is a slack rate limit error and retry after 60 seconds if retry after header is missing', () => {
    const result = slackRateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test' } })
      .transformOutput({
        result: {
          data: 'test',
          error: new SlackAPIError('test', 'ratelimited', {
            ok: false,
            error: 'ratelimited',
            headers: new Headers(),
          }),
        },
      });

    expect(result).toMatchObject({
      result: { data: 'test' },
    });
    expect(result?.result.error).toBeInstanceOf(RetryAfterError);
    expect(result?.result.error.retryAfter).toEqual('60');
  });

  it('Should transform the output if there is a slack rate limit error and retry after value specified in header', () => {
    const result = slackRateLimitMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'test' } })
      .transformOutput({
        result: {
          data: 'test',
          error: new SlackAPIError('test', 'ratelimited', {
            ok: false,
            error: 'ratelimited',
            headers: new Headers({
              'Retry-After': '10',
            }),
          }),
        },
      });

    expect(result).toMatchObject({
      result: { data: 'test' },
    });
    expect(result?.result.error).toBeInstanceOf(RetryAfterError);
    expect(result?.result.error.retryAfter).toEqual('10');
  });
});
