import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/linear/auth';
import * as usersConnector from '@/connectors/linear/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { LinearError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const refreshToken = 'some refresh token';
const expiresIn = 60;
const region = 'us';
const now = new Date();
const getTokenData = {
  accessToken,
  refreshToken,
  expiresIn,
};

const authUserId = 'test-auth-user-id';
const workspaceUrlKey = 'test-workspace-url-key';
const getAuthUserData = {
  authUserId,
  workspaceUrlKey,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken,
  refreshToken,
  authUserId,
  workspaceUrlKey,
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mock the getToken function to return a predefined token
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    const getAuthUser = vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(getAuthUserData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getToken was called correctly
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith(accessToken);
    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new LinearError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'linear/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'linear/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    // mock getToken as above
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    const getAuthUser = vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(getAuthUserData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith(accessToken);

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new LinearError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'linear/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'linear/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');
    // mock getToken to reject with a dumb error for an invalid code
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    // assert that the function throws the mocked error
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
