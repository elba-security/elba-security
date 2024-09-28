import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { SumologicError } from '@/connectors/commons/error';
import { type SumologicUser } from '@/connectors/users';
import { registerOrganisation } from './service';

const accessId = 'test-access-id';
const accessKey = 'test-access-key';
const sourceRegion = 'EU';
const region = 'us';
const now = new Date();
const validUsers: SumologicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  isActive: true,
  isMfaEnabled: false,
  email: `user-${i}@foo.bar`,
}));

const getUsersData = {
  validUsers,
  invalidUsers: [],
  nextPage: null,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessId,
  accessKey,
  sourceRegion,
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
        accessId,
        accessKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({accessId, accessKey, sourceRegion});
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));
    if (!storedOrganisation) {
      throw new SumologicError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessId)).resolves.toEqual(accessId);
    await expect(decrypt(storedOrganisation.accessKey)).resolves.toEqual(accessKey);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sumologic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sumologic/sumologic.elba_app.installed',
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
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        accessId,
        accessKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new SumologicError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessId)).resolves.toEqual(accessId);
    await expect(decrypt(storedOrganisation.accessKey)).resolves.toEqual(accessKey);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sumologic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sumologic/sumologic.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
