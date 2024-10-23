import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/salesforce/auth';
import * as userConnector from '@/connectors/salesforce/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { SalesforceError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const accessTokenType = 'access_token';
const refreshToken = 'some refresh token';
const expiresAt = 1718939949;
const instanceUrl = 'some url';
const region = 'us';
const now = new Date();

const getTokenData = {
  accessToken,
  refreshToken,
  instanceUrl,
};

const getExpiresInData = {
  expiresAt,
};
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '00000001',
  accessToken,
  refreshToken,
  instanceUrl,
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
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    const getAuthUser = vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      userId: organisation.authUserId,
    });
    const getExpiresIn = vi
      .spyOn(authConnector, 'getExpiresIn')
      .mockResolvedValue(getExpiresInData);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({
      accessToken,
      instanceUrl,
    });

    expect(getExpiresIn).toBeCalledTimes(1);
    expect(getExpiresIn).toBeCalledWith({ token: accessToken, tokenType: accessTokenType });

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesforceError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: 0,
        },
      },
      {
        name: 'salesforce/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'salesforce/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: new Date(expiresAt).getTime() * 1000,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SalesforceError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'salesforce/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: 0,
        },
      },
      {
        name: 'salesforce/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'salesforce/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: new Date(expiresAt).getTime() * 1000,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
