import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import type { FivetranUser } from '@/connectors/users';
import { FivetranError } from '@/connectors/commons/error';
import { decrypt } from '@/common/crypto';
import { registerOrganisation } from './service';

const apiKey = 'test-api-key';
const apiSecret = 'test-api-secret';
const region = 'us';
const now = new Date();
const validUsers: FivetranUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  given_name: `given_name-${i}`,
  family_name: `family_name-${i}`,
  role: 'Account Administrator',
  active: true,
  email: `user${i}@foo.bar`,
  invited: false,
}));

const invalidUsers = [];
const getUsersData = {
  validUsers,
  invalidUsers,
  nextPage: null,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  apiKey,
  apiSecret,
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
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        apiSecret,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, apiSecret });

    // verify the organisation token is set in the database
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
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        apiSecret,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, apiSecret });

    // check if the apiKey in the database is updated
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
    // verify that the user/sync event is sent
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
