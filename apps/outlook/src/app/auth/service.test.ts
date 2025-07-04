import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/microsoft/auth';
import * as usersConnector from '@/connectors/microsoft/user';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { setupOrganisation } from './service';

const tenantId = 'some-tenant';
const token = 'some-token';
const region = 'us';
const now = new Date();
const expiresIn = 60;

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: 'test-token',
  tenantId,
  region: 'eu',
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
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue({ token, expiresIn });
    const getUsers = vi
      .spyOn(usersConnector, 'getUsers')
      .mockResolvedValue({ validUsers: [], invalidUsers: [], nextSkipToken: null });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId,
        region,
      })
    ).resolves.toStrictEqual({
      isAppInstallationCompleted: true,
    });

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(tenantId);
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ token, tenantId, skipToken: null });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        region,
        tenantId,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'outlook/common.organisation.inserted',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'outlook/users.sync.requested',
        data: {
          organisationId: organisation.id,
          isFirstSync: true,
          syncStartedAt: now.getTime(),
          skipToken: null,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue({ token, expiresIn });
    const getUsers = vi
      .spyOn(usersConnector, 'getUsers')
      .mockResolvedValue({ validUsers: [], invalidUsers: [], nextSkipToken: null });
    await db.insert(organisationsTable).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId,
        region,
      })
    ).resolves.toStrictEqual({ isAppInstallationCompleted: true });

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(tenantId);
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ token, tenantId, skipToken: null });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        region,
        tenantId,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'outlook/common.organisation.inserted',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'outlook/users.sync.requested',
        data: {
          organisationId: organisation.id,
          isFirstSync: true,
          syncStartedAt: now.getTime(),
          skipToken: null,
        },
      },
    ]);
  });

  test('should not setup the organisation when the tenantId is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid tenant id');
    const wrongTenantId = 'wrong-tenant-id';
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);
    const getUsers = vi
      .spyOn(usersConnector, 'getUsers')
      .mockResolvedValue({ validUsers: [], invalidUsers: [], nextSkipToken: null });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId: wrongTenantId,
        region,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(wrongTenantId);
    expect(getUsers).toBeCalledTimes(0);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
