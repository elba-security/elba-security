import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/gitlab/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const expiresIn = 60;
const region = 'us';
const now = new Date();

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: 'old-access-token',
  refreshToken: 'old-refresh-token',
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(tokens);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    const insertedOrganisation = await db
      .select({
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    expect({
      region: organisation.region,
      accessToken: await decrypt(insertedOrganisation.at(0)?.accessToken ?? ''),
      refreshToken: await decrypt(insertedOrganisation.at(0)?.refreshToken ?? ''),
    }).toStrictEqual({
      region,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'gitlab/users.sync.triggered',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'gitlab/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'gitlab/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + expiresIn * 1000,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);

    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(tokens);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    const insertedOrganisation = await db
      .select({
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    expect({
      region: organisation.region,
      accessToken: await decrypt(insertedOrganisation.at(0)?.accessToken ?? ''),
      refreshToken: await decrypt(insertedOrganisation.at(0)?.refreshToken ?? ''),
    }).toStrictEqual({
      region,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'gitlab/users.sync.triggered',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'gitlab/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'gitlab/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + expiresIn * 1000,
        },
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
