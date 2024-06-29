import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { StatsigError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const apiKey = 'test-api-key';
const region = 'us';
const now = new Date();
const getAllUsersData = {
  validUsers: [
    {
      email: `user@foo.bar`,
      firstName: `first_name`,
      lastName: `last_name`,
      role: `owner`,
    },
  ],
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
    const getAllUsers = vi.spyOn(userConnector, 'getAllUsers').mockResolvedValue(getAllUsersData);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        region,
        apiKey,
      })
    ).resolves.toBeUndefined();

    // check if getAllUsers was called correctly
    expect(getAllUsers).toBeCalledTimes(1);
    expect(getAllUsers).toBeCalledWith({ apiKey });
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));
    if (!storedOrganisation) {
      throw new StatsigError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'statsig/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
        },
      },
      {
        name: 'statsig/app.installed',
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
    // mocked the getAllUsers function
    const getAllUsers = vi.spyOn(userConnector, 'getAllUsers').mockResolvedValue(getAllUsersData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        region,
        apiKey,
      })
    ).resolves.toBeUndefined();
    expect(getAllUsers).toBeCalledTimes(1);
    expect(getAllUsers).toBeCalledWith({ apiKey });
    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new StatsigError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'statsig/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
        },
      },
      {
        name: 'statsig/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
