import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/monday/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import type { GetTokenResponseData } from '@/connectors/monday/auth';
import * as crypto from '@/common/crypto';
import { setupOrganisation } from './service';

const organisationId = '00000000-0000-0000-0000-000000000001';
const code = 'some-code';
const region = 'us';
const now = new Date();
const tokenResponse: GetTokenResponseData = {
  access_token: 'mock-token',
};

const organisation = {
  id: organisationId,
  token: 'test-token',
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue('mock-token');
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(tokenResponse);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token: tokenResponse.access_token,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'monday/users.sync.requested',
        data: {
          organisationId,
          syncStartedAt: now.getTime(),
          isFirstSync: true,
          page: 1,
        },
      },
      {
        data: {
          organisationId,
        },
        name: 'monday/app.installed',
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(tokenResponse);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    await expect(
      db
        .select({ token: organisationsTable.token })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token: tokenResponse.access_token,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'monday/users.sync.requested',
        data: {
          organisationId,
          syncStartedAt: now.getTime(),
          isFirstSync: true,
          page: 1,
        },
      },
      {
        data: {
          organisationId: organisation.id,
        },
        name: 'monday/app.installed',
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');

    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
