import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { addSeconds } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { DocusignError } from '@/connectors/common/error';
import * as authConnector from '@/connectors/docusign/auth';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const region = 'us';
const now = new Date();
const expiresIn = 3600;

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accountId: '00000000-0000-0000-0000-000000000010',
  authUserId: '00000000-0000-0000-0000-000000000011',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  apiBaseUri: 'https://api.docusign.net',
  region: 'us',
};

const getTokenData = {
  accessToken,
  refreshToken: 'refresh-token',
  expiresIn,
};

const getAccountData = {
  authUserId: organisation.authUserId,
  accountId: organisation.accountId,
  apiBaseUri: organisation.apiBaseUri,
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
    const getAuthUser = vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue(getAccountData);

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

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new DocusignError(`Organisation with ID ${organisation.id} not found.`);
    }

    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'docusign/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'docusign/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'docusign/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: addSeconds(now, expiresIn).getTime(),
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);

    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue(getAccountData);

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
      throw new DocusignError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'docusign/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'docusign/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'docusign/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: addSeconds(now, expiresIn).getTime(),
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');

    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);
    const getAccount = vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue(getAccountData);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAccount).toBeCalledTimes(0);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
