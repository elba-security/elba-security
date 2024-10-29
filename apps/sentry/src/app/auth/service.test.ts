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
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        installationId,
        organizationSlug,
      })
    ).resolves.toBeUndefined();
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SentryError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

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
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await db.insert(organisationsTable).values(organisation);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        organizationSlug,
        installationId,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new SentryError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

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
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');

    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        installationId,
        organizationSlug,
      })
    ).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code, installationId);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
