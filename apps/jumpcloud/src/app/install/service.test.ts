import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { JumpcloudError } from '@/connectors/commons/error';
import { type JumpcloudUser } from '@/connectors/users';
import { registerOrganisation } from './service';

const apiKey = 'test-access-id';
const region = 'us';
const now = new Date();

const validUsers: JumpcloudUser[] = Array.from({ length: 5 }, (_, i) => ({
  _id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstname: `firstname-${i}`,
  lastname: `lastname-${i}`,
  suspended: false,
  enableMultiFactor: false,
  email: `user-${i}@foo.bar`,
}));

const getUsersData = {
  validUsers,
  invalidUsers: [],
  nextPage: null,
};
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  apiKey,
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
        region,
      })
    ).resolves.toBeUndefined();
    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, after: null, role: 'admin' });
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));
    if (!storedOrganisation) {
      throw new JumpcloudError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jumpcloud/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          role: 'admin',
          page: null,
        },
      },
      {
        name: 'jumpcloud/jumpcloud.elba_app.installed',
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
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiKey, after: null, role: 'admin' });

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new JumpcloudError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jumpcloud/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          role: 'admin',
          page: null,
        },
      },
      {
        name: 'jumpcloud/jumpcloud.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
