import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/datadog/users';
import * as crypto from '@/common/crypto';
import { registerOrganisation } from './service';

const apiKey = 'test-apiKey';
const appKey = 'test-appKey';
const authUserId = 'test-authUserId';
const sourceRegion = 'EU';
const region = 'us';
const now = new Date();

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey,
  appKey,
  authUserId,
  sourceRegion,
  region,
};

const getUsersData = [
  {
    accountId: '1',
    displayName: 'admin',
    active: true,
    emailAddress: 'john@example.com',
  },
];

describe('registerOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation id is valid and the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // @ts-expect-error -- this is a mock
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    const getAuthUser = vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      authUserId,
    });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue(apiKey);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        appKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, appKey, sourceRegion, page: 0 });

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({ apiKey, appKey, sourceRegion });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey,
        appKey,
        sourceRegion,
        region,
      },
    ]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'datadog/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: 0,
        },
      },
      {
        name: 'datadog/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
    expect(crypto.encrypt).toBeCalledTimes(1);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // @ts-expect-error -- this is a mock
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    await db.insert(organisationsTable).values(organisation);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        appKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, appKey, sourceRegion, page: 0 });

    await expect(
      db
        .select({
          apiKey: organisationsTable.apiKey,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey,
      },
    ]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'datadog/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: 0,
        },
      },
      {
        name: 'datadog/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      authUserId,
    });
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    await expect(
      registerOrganisation({
        organisationId: wrongId,
        apiKey,
        appKey,
        sourceRegion,
        region,
      })
    ).rejects.toThrowError(error);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
    expect(send).toBeCalledTimes(0);
  });
});
