import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { ElasticError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const apiKey = 'test-personal-token';
const accountId = '10000';
const region = 'us';
const now = new Date();
const getAccountIdData = {
  accountId,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accountId,
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
    const getAccountId = vi
      .spyOn(userConnector, 'getAccountId')
      .mockResolvedValue(getAccountIdData);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getAccountId).toBeCalledTimes(1);
    expect(getAccountId).toBeCalledWith({ apiKey });
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new ElasticError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'elastic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'elastic/app.installed',
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
    const getAccountId = vi
      .spyOn(userConnector, 'getAccountId')
      .mockResolvedValue(getAccountIdData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getUsers was called correctly
    expect(getAccountId).toBeCalledTimes(1);
    expect(getAccountId).toBeCalledWith({ apiKey });
    // check if the apiKey in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new ElasticError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.apiKey)).resolves.toEqual(apiKey);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'elastic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'elastic/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
