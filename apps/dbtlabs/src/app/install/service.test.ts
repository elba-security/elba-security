import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/dbtlabs/users';
import { decrypt } from '@/common/crypto';
import { DbtlabsError } from '@/connectors/common/error';
import { registerOrganisation } from './service';

const serviceToken = 'test-personal-token';
const accountId = '10000';
const accessUrl = 'https://example.us1.dbt.com';
const region = 'us';
const now = new Date();
const getUsersData = {
  validUsers: [
    {
      id: 1,
      first_name: `first_name`,
      last_name: `last_name`,
      fullname: `fullname`,
      is_active: true,
      email: `user@foo.bar`,
    },
  ],
  invalidUsers: [],
  nextPage: null,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accountId,
  serviceToken,
  accessUrl,
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
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        region,
        serviceToken,
        accountId,
        accessUrl,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ serviceToken, accountId, accessUrl });
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new DbtlabsError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.serviceToken)).resolves.toEqual(serviceToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'dbtlabs/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'dbtlabs/app.installed',
        data: {
          organisationId: organisation.id,
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
    await db.insert(organisationsTable).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        region,
        serviceToken,
        accountId,
        accessUrl,
      })
    ).resolves.toBeUndefined();
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ serviceToken, accountId, accessUrl });
    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new DbtlabsError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.serviceToken)).resolves.toEqual(serviceToken);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'dbtlabs/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'dbtlabs/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });
});
