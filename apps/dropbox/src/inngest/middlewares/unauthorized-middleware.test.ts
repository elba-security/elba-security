import { beforeEach } from 'node:test';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { unauthorizedMiddleware } from './unauthorized-middleware';
import { insertOrganisations } from '@/test-utils/token';
import { DropboxResponseError } from 'dropbox';

const organisationId = '00000000-0000-0000-0000-000000000000';
const region = 'eu';

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 1,
    });
  });

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

  test('should not transform the output when the error is not about Dropbox authorization', async () => {
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
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(
      unauthorizedMiddleware
        // @ts-expect-error -- this is a mock
        .init({ client: { send } })
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: generalError,
          },
        })
    ).resolves.toBeUndefined();
    expect(send).toBeCalledTimes(0);
  });

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const unauthorizedError = new DropboxResponseError(
      401,
      {},
      {
        error_summary: 'invalid_access_token/...',
        error: {
          '.tag': 'invalid_access_token',
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
        ctx: { event: { data: { organisationId, region } } },
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
      name: 'dropbox/elba_app.uninstall.requested',
      data: {
        organisationId,
      },
    });
  });
});
