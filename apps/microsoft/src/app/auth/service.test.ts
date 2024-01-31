import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as crypto from '@/common/crypto';
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
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
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(token);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(tenantId);
    expect(crypto.encrypt).toBeCalledTimes(1);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
        region,
        tenantId,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'microsoft/users.sync_page.triggered',
        data: {
          tenantId,
          organisationId: organisation.id,
          region,
          isFirstSync: true,
          syncStartedAt: now.getTime(),
          skipToken: null,
        },
      },
      {
        name: 'microsoft/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
          tenantId,
          region,
        },
        ts: now.getTime() + (expiresIn - 5) * 60 * 1000,
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue({ token, expiresIn });
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(token);
    await db.insert(Organisation).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(tenantId);
    expect(crypto.encrypt).toBeCalledTimes(1);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
        region,
        tenantId,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'microsoft/users.sync_page.triggered',
        data: {
          tenantId,
          organisationId: organisation.id,
          region,
          isFirstSync: true,
          syncStartedAt: now.getTime(),
          skipToken: null,
        },
      },
      {
        name: 'microsoft/token.refresh.triggered',
        data: {
          organisationId: organisation.id,
          tenantId,
          region,
        },
        ts: now.getTime() + (expiresIn - 5) * 60 * 1000,
      },
    ]);
  });

  test('should not setup the organisation when the tenantId is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid tenant id');
    const wrongTenantId = 'wrong-tenant-id';
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        tenantId: wrongTenantId,
        region,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(wrongTenantId);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
