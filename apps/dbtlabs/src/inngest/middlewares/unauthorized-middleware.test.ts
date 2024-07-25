import { beforeEach } from 'node:test';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import type { Organisation } from '@/database/schema';
import { organisationsTable } from '@/database/schema';
import { DbtlabsError } from '@/connectors/common/error';
import { unauthorizedMiddleware } from './unauthorized-middleware';

const organisation: Organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessUrl: 'https://example.us1.dbt.com',
  accountId: '10000',
  serviceToken: 'test-personal-token',
  region: 'us',
};

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

  test('should not transform the output when the error is not about dbtlabs authorization', async () => {
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

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about dbtlabs authorization', async () => {
    const unauthorizedError = new DbtlabsError('foo bar', {
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
      name: 'dbtlabs/app.uninstalled',
      data: {
        organisationId: organisation.id,
      },
    });
  });
});
