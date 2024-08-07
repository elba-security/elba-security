import { describe, expect, test } from 'vitest';
import { CalendlyError } from './error';
import { getRetryAfter } from './retry-after';

describe('getRetryAfter', () => {
  test('should return null when the error is not about rate limit', () => {
    expect(getRetryAfter(new Error('foo bar'))).toBeUndefined();
  });

  test('should return retry after duration when the error is about rate limit', () => {
    const rateLimitError = new CalendlyError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'X-RateLimit-Reset': '60' }),
      },
    });

    expect(getRetryAfter(rateLimitError)).toStrictEqual('60s');
  });
});
