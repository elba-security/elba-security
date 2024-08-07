import { describe, expect, test } from 'vitest';
import { getRetryAfter } from './retry-after';
import { DatadogError } from './error';

describe('getRetryAfter', () => {
  test('should return null when the error is not about rate limit', () => {
    expect(getRetryAfter(new Error('foo bar'))).toBeUndefined();
  });

  test('should return retry after duration when the error is about rate limit', () => {
    const rateLimitError = new DatadogError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'Retry-After': '10' }),
      },
    });

    expect(getRetryAfter(rateLimitError)).toStrictEqual('10s');
  });
});
