import { beforeEach } from 'node:test';
import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { MicrosoftError } from '@/connectors/commons/error';
import { unauthorizedMiddleware } from './unauthorized-middleware';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'us',
  tenantId: 'tenant-id',
  token: 'some-token',
};

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await db.insert(Organisation).values(organisation);
  });

  test('should not transform the output when their is no error', async () => {
    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {},
        })
    ).resolves.toBeUndefined();
  });

  test('should not transform the output when the error is not about github authorization', async () => {
    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: new Error('foo bar'),
          },
        })
    ).resolves.toBeUndefined();
  });

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const elba = spyOnElba();
    const unauthorizedError = new MicrosoftError('foo bar', {
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

    const result = await unauthorizedMiddleware
      .init()
      .onFunctionRun({
        // @ts-expect-error -- this is a mock
        fn: { name: 'foo' },
        ctx: {
          // @ts-expect-error -- this is a mock
          event: {
            data: {
              organisationId: organisation.id,
              region: organisation.region,
              tenantId: organisation.tenantId,
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

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);
  });
});
