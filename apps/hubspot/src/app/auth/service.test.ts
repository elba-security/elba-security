import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/hubspot/auth';
import * as timeZoneConnector from '@/connectors/hubspot/account-info';
import * as userConnector from '@/connectors/hubspot/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { HubspotError } from '@/connectors/hubspot/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some token';
const refreshToken = 'some refresh token';
const expiresIn = 60;
const region = 'us';
const timeZone = 'us/eastern';
const domain = 'foo-bar.hubspot.com';
const portalId = 12345;

const now = new Date();
const getTokenData = {
  accessToken,
  refreshToken,
  expiresIn,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '1001',
  accessToken,
  refreshToken,
  region,
  timeZone,
  domain,
  portalId,
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
    const getAccountInfo = vi.spyOn(timeZoneConnector, 'getAccountInfo').mockResolvedValue({
      timeZone,
      portalId,
      uiDomain: domain,
    });
    const getAuthUser = vi.spyOn(userConnector, 'getAuthUser').mockResolvedValue({
      userId: organisation.authUserId,
    });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAccountInfo).toBeCalledTimes(1);
    expect(getAccountInfo).toBeCalledWith(accessToken);

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith(accessToken);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new HubspotError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);
    expect(storedOrganisation).toMatchObject({
      region,
      timeZone,
      portalId,
      domain,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'hubspot/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'hubspot/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'hubspot/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
      {
        name: 'hubspot/timezone.refresh.requested',
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

    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    const getAccountInfo = vi.spyOn(timeZoneConnector, 'getAccountInfo').mockResolvedValue({
      timeZone,
      portalId: 54321,
      uiDomain: `2-${domain}`,
    });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getAccountInfo).toBeCalledTimes(1);
    expect(getAccountInfo).toBeCalledWith(accessToken);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new HubspotError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);
    expect(storedOrganisation).toMatchObject({
      region,
      timeZone,
      portalId: 54321,
      domain: `2-${domain}`,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'hubspot/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'hubspot/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'hubspot/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
      {
        name: 'hubspot/timezone.refresh.requested',
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
