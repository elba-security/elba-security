import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/sentry/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { SentryError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const refreshToken = 'some refresh token';
const expiresAt = '2100-01-01T00:00:00.000Z';
const region = 'us';
const now = new Date();
const installationId = 'test-installation-id';
const organizationSlug = 'test-organizationSlug';
const getTokenData = {
  accessToken,
  refreshToken,
  expiresAt,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken,
  refreshToken,
  installationId,
  organizationSlug,
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
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mock the getToken function to return a predefined token
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        installationId,
        organizationSlug,
      })
    ).resolves.toBeUndefined();

    // check if getToken was called correctly
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    // verify the organisation token is set in the database
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SentryError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sentry/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sentry/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
      {
        name: 'sentry/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: new Date(expiresAt).getTime(),
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    // mock getToken as above
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        organizationSlug,
        installationId,
      })
    ).resolves.toBeUndefined();

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    // check if the token in the database is updated
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SentryError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sentry/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sentry/app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
      {
        name: 'sentry/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: new Date(expiresAt).getTime(),
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // mock inngest client
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
        installationId,
        organizationSlug,
      })
    ).rejects.toThrowError(error);

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
