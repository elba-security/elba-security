import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/salesloft/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { SalesloftError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const refreshToken = 'some refresh token';
const expiresIn = 60;
const region = 'us';
const now = new Date();

const getTokenData = {
  accessToken,
  refreshToken,
  expiresIn,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken,
  refreshToken,
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
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesloftError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesloft/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'salesloft/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'salesloft/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);

    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesloftError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesloft/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'salesloft/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'salesloft/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
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
