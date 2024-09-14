import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { AircallError } from './error';
import { getRetryAfter } from './retry-after';

const now = new Date('2024-06-17T10:00:00.000Z');

describe('getRetryAfter', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should return null when the error is not about rate limit', () => {
    expect(getRetryAfter(new Error('foo bar'))).toBeUndefined();
  });

  test('should return retry after duration when the error is about rate limit', () => {
    vi.setSystemTime(now);
    const rateLimitError = new AircallError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 429,
        headers: new Headers({ 'x-aircallapi-reset': String(now.getTime() + 180000) }), // 3 minutes
      },
    });

    expect(getRetryAfter(rateLimitError)).toStrictEqual('180s');
  });
});
