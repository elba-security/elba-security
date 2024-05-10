import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/segment/users';
import type { SegmentUser } from '@/connectors/segment/users';
import { SegmentError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { registerOrganisation } from './service';

const token = 'test-api-key';
const region = 'us';
const now = new Date();

const validUsers: SegmentUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  name: `name-${i}`,
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
  token,
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
        token,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ token });

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, mockOrganisation.id));

    if (!organisation) {
      throw new SegmentError(`Organisation with ID ${mockOrganisation.id} not found.`);
    }

    expect(organisation.region).toBe(region);
    await expect(decrypt(organisation.token)).resolves.toEqual(token);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'segment/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: mockOrganisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'segment/app.installed',
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
        token,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ token });

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, mockOrganisation.id));

    if (!storedOrganisation) {
      throw new SegmentError(`Organisation with ID ${mockOrganisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.token)).resolves.toEqual(token);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'segment/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: mockOrganisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'segment/app.installed',
        data: {
          organisationId: mockOrganisation.id,
        },
      },
    ]);
  });
});
