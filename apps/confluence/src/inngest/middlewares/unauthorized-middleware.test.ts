import { beforeEach } from 'node:test';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { ConfluenceError } from '@/connectors/confluence/common/error';
import { organisation } from '../functions/__mocks__/organisations';
import { unauthorizedMiddleware } from './unauthorized-middleware';

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
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

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const unauthorizedError = new ConfluenceError('foo bar', {
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
        ctx: {
          // @ts-expect-error -- this is a mock
          event: {
            data: {
              organisationId: organisation.id,
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
      name: 'confluence/app.uninstalled',
      data: {
        organisationId: organisation.id,
      },
    });
  });
});
