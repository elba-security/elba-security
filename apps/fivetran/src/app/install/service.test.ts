import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/fivetran/users';
import { FivetranError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { registerOrganisation } from './service';

const apiKey = 'test-api-key';
const apiSecret = 'test-api-secret';
const region = 'us';
const authUserId = 'test-auth-user-id';
const now = new Date();

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey,
  apiSecret,
  authUserId,
  region,
};

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
    const getAuthUser = vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      authUserId,
    });

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        apiSecret,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({ apiKey, apiSecret });

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new FivetranError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    await expect(decrypt(storedOrganisation.apiSecret)).resolves.toEqual(apiSecret);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'fivetran/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'fivetran/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue(undefined);
    const getAuthUser = vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      authUserId,
    });

    await db.insert(organisationsTable).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        apiSecret,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({ apiKey, apiSecret });

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new FivetranError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    await expect(decrypt(storedOrganisation.apiSecret)).resolves.toEqual(apiSecret);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'fivetran/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'fivetran/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
