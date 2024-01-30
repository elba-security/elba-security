import { describe, expect, test, vi } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { NonRetriableError } from 'inngest';
import { unauthorizedMiddleware } from './unauthorized-middleware';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'us',
  installationId: 0,
  accountLogin: 'some-login',
};

describe('unauthorized middleware', () => {
  test('should not transform the output when their is no error', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(
      unauthorizedMiddleware
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

  test('should not transform the output when the error is not about github authorization', async () => {
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(
      unauthorizedMiddleware
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

  test('should transform the output error to NonRetriableError and send an uninstall event when the error is about github authorization', async () => {
    const unauthorizedError = new RequestError('foo bar', 401, {
      request: { method: 'GET', url: 'http://foo.bar', headers: {} },
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

    const result = await unauthorizedMiddleware
      // @ts-expect-error -- this is a mock
      .init({ client: { send } })
      .onFunctionRun({
        // @ts-expect-error -- this is a mock
        fn: { name: 'foo' },
        // @ts-expect-error -- this is a mock
        ctx: { event: { data: { organisationId, region: 'us' } } },
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
      name: 'github/github.elba_app.uninstalled',
      data: {
        organisationId: organisation.id,
      },
    });
  });
});
