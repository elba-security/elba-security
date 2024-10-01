import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/fifteenfive/users';
import type { FifteenFiveUser } from '@/connectors/fifteenfive/users';
import { FifteenFiveError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { registerOrganisation } from './service';

const apiKey = 'test-api-key';
const email = 'test-owner-email';
const region = 'us';
const now = new Date();

const validUsers: FifteenFiveUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user${i}@foo.bar`,
}));

const invalidUsers = [];
const getUsersData = {
  validUsers,
  invalidUsers,
  nextPage: null,
};

const mockOrganisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey,
  email,
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
        organisationId: mockOrganisation.id,
        apiKey,
        email,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey });

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, mockOrganisation.id));

    if (!organisation) {
      throw new FifteenFiveError(`Organisation with ID ${mockOrganisation.id} not found.`);
    }

    expect(organisation.region).toBe(region);
    await expect(decrypt(organisation.apiKey)).resolves.toEqual(apiKey);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'fifteenfive/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: mockOrganisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'fifteenfive/app.installed',
        data: {
          organisationId: mockOrganisation.id,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(mockOrganisation);

    await expect(
      registerOrganisation({
        organisationId: mockOrganisation.id,
        apiKey,
        email,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey });

    // check if the apiKey in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, mockOrganisation.id));

    if (!storedOrganisation) {
      throw new FifteenFiveError(`Organisation with ID ${mockOrganisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'fifteenfive/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: mockOrganisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'fifteenfive/app.installed',
        data: {
          organisationId: mockOrganisation.id,
        },
      },
    ]);
  });
});
