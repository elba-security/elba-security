import { describe, expect, test } from 'vitest';
import { BoxError } from './error';
import { getRetryAfter } from './retry-after';

describe('getRetryAfter', () => {
  test('should return null when the error is not about rate limit', () => {
    expect(getRetryAfter(new Error('foo bar'))).toBeUndefined();
  });

  test('should return retry after duration when the error is about rate limit', () => {
    const rateLimitError = new BoxError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'Retry-After': '10' }),
      },
    });

    expect(getRetryAfter(rateLimitError)).toStrictEqual('10s');
  });
});
