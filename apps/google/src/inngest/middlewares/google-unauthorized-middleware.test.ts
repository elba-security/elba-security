import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { GoogleUnauthorizedError } from '@/connectors/google/errors';
import { googleUnauthorizedMiddleware } from './google-unauthorized-middleware';

describe('google-unauthorized-middleware', () => {
  test('should not transform the output when there is no error', async () => {
    const send = vi.fn().mockResolvedValue(undefined);

    const result = await googleUnauthorizedMiddleware
      // @ts-expect-error -- this is a mock
      .init({ client: { send } })
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
      .transformOutput({
        result: {},
      });

    expect(result).toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });

  test('should not transform the output when the error is not about google authorization', async () => {
    const send = vi.fn().mockResolvedValue(undefined);

    const result = await googleUnauthorizedMiddleware
      // @ts-expect-error -- this is a mock
      .init({ client: { send } })
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
      .transformOutput({
        result: {
          error: new Error('test'),
        },
      });

    expect(result).toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });

  test('should transform the output error to NonRetriableError and send an event to remove organisation when the error is about google authorization', async () => {
    const unauthorizedError = new GoogleUnauthorizedError('test');

    const send = vi.fn().mockResolvedValue(undefined);

    const result = await googleUnauthorizedMiddleware
      // @ts-expect-error -- this is a mock
      .init({ client: { send } })
      .onFunctionRun({
        // @ts-expect-error -- this is a mock
        fn: { name: 'foo' },
        // @ts-expect-error -- this is a mock
        ctx: { event: { data: { organisationId: 'org-id' } } },
      })
      .transformOutput({
        result: {
          data: 'test',
          error: unauthorizedError,
        },
      });
    expect(result?.result.error.cause).toStrictEqual(unauthorizedError);
    expect(result).toStrictEqual({
      result: {
        data: 'test',
        error: new NonRetriableError("Google unauthorized error for 'foo'"),
      },
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'google/common.remove_organisation.requested',
      data: {
        organisationId: 'org-id',
      },
    });
  });
});
