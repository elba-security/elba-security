import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/jira/users';
import * as crypto from '@/common/crypto';
import { registerOrganisation } from './service';

const apiToken = 'test-apiToken';
const domain = 'test-domain';
const email = 'test@email';
const region = 'us';
const now = new Date();

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiToken,
  domain,
  email,
  region,
};

const getUsersData = [
  {
    accountId: '1',
    displayName: 'admin',
    active: true,
    emailAddress: 'john@example.com',
  },
];

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
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(apiToken);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiToken,
        domain,
        email,
        region,
      })
    ).resolves.toBeUndefined();
    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiToken, domain, email, page: null });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiToken,
        domain,
        email,
        region,
      },
    ]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jira/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'jira/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
    expect(crypto.encrypt).toBeCalledTimes(1);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiToken,
        domain,
        email,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getUsers).toBeCalledTimes(1);
    expect(getUsers).toBeCalledWith({ apiToken, domain, email, page: null });

    // check if the apiToken in the database is updated
    await expect(
      db
        .select({
          apiToken: organisationsTable.apiToken,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiToken,
      },
    ]);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'jira/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'jira/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(getUsersData);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        apiToken,
        domain,
        email,
        region,
      })
    ).rejects.toThrowError(error);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
