import { beforeEach } from 'node:test';
import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { unauthorizedMiddleware } from './unauthorized-middleware';
import { insertOrganisations } from '@/test-utils/token';
import { DropboxResponseError } from 'dropbox';
import { env } from '@/env';
import { organisations } from '@/database';

const organisationId = '00000000-0000-0000-0000-000000000000';
const region = 'eu';

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 1,
    });
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

    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: generalError,
          },
        })
    ).resolves.toBeUndefined();
  });

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const elba = spyOnElba();
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

    const result = await unauthorizedMiddleware
      .init()
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

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });
    await expect(
      db.select().from(organisations).where(eq(organisations.organisationId, organisationId))
    ).resolves.toHaveLength(0);
  });
});
