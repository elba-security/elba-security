import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createElbaConnectionErrorMiddelware } from './elba-connection-error';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';

class UnauthorizedError extends Error {
  response: Response;

  constructor(
    message: string,
    { response, ...opts }: Parameters<ErrorConstructor>[1] & { response: Response }
  ) {
    super(message, opts);
    this.name = 'UnauthorizedError';
    this.response = response;
  }
}

const middleware = createElbaConnectionErrorMiddelware({
  eventName: 'connection-error-event',
  mapErrorFn: (error) => {
    if (error instanceof UnauthorizedError) {
      return 'unauthorized';
    }
    return null;
  },
});

describe('unauthorized middleware', () => {
  test('should not transform the output when their is no error', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(
      middleware
        // @ts-expect-error -- this is a mock
        .init({ client: { send } })
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {},
        })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });

  test('should not transform the output when the error is not mapped', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(
      middleware
        // @ts-expect-error -- this is a mock
        .init({ client: { send } })
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: new Error('foo bar'),
          },
        })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(0);
  });

  test('should transform the output error to NonRetriableError and send event when the error is mapped', async () => {
    const unauthorizedError = new UnauthorizedError('foo bar', {
      // @ts-expect-error this is a mock
      response: {
        status: 401,
      },
    });

    const context = {
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
        error: unauthorizedError,
      },
    };

    const send = vi.fn().mockResolvedValue(undefined);
    const result = await middleware
      // @ts-expect-error -- this is a mock
      .init({ client: { send } })
      .onFunctionRun({
        // @ts-expect-error -- this is a mock
        fn: { name: 'foo' },
        ctx: {
          // @ts-expect-error -- this is a mock
          event: {
            data: {
              region,
              organisationId,
            },
          },
        },
      })
      .transformOutput(context);
    expect(result?.result.error).toBeInstanceOf(NonRetriableError);
    expect(result?.result.error.cause).toStrictEqual(unauthorizedError);
    expect(result).toMatchObject({
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
      },
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'connection-error-event',
      data: {
        region,
        organisationId,
        errorMetadata: {
          message: 'foo bar',
          name: 'UnauthorizedError',
          response: {
            status: 401,
          },
          stack: expect.any(String), // eslint-disable-line -- We can't exactly match the stack trace
        },
        errorType: 'unauthorized',
      },
    });
  });
});
