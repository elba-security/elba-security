import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/zendesk/auth';
import * as usersConnector from '@/connectors/zendesk/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { ZendeskError } from '@/connectors/common/error';
import { decrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const accessToken = 'some-token';
const region = 'us';
const now = new Date();
const subDomain = 'some-subdomain';
const ownerId = 'test-owner-id';
const authUserId = 'test-auth-user-id';
const getTokenData = {
  accessToken,
};

const getOwnerIdData = {
  ownerId,
  subDomain,
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken,
  region,
  subDomain,
  ownerId,
  authUserId,
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
    const getOwnerId = vi.spyOn(usersConnector, 'getOwnerId').mockResolvedValue(getOwnerIdData);
    const getAuthUser = vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({ authUserId });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        subDomain,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith({ code, subDomain });

    expect(getOwnerId).toBeCalledTimes(1);
    expect(getOwnerId).toBeCalledWith({ accessToken, subDomain });

    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({ accessToken, subDomain });
    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new ZendeskError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'zendesk/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'zendesk/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await db.insert(organisationsTable).values(organisation);

    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenData);
    const getOwnerId = vi.spyOn(usersConnector, 'getOwnerId').mockResolvedValue(getOwnerIdData);
    const getAuthUser = vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({ authUserId });

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        subDomain,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith({ code, subDomain });
    expect(getOwnerId).toBeCalledTimes(1);
    expect(getOwnerId).toBeCalledWith({ accessToken, subDomain });
    expect(getAuthUser).toBeCalledTimes(1);
    expect(getAuthUser).toBeCalledWith({ accessToken, subDomain });

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!storedOrganisation) {
      throw new ZendeskError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'zendesk/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'zendesk/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');

    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);
    const getAuthUser = vi.spyOn(usersConnector, 'getAuthUser');

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
        subDomain,
      })
    ).rejects.toThrowError(error);
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith({ code, subDomain });

    expect(getAuthUser).toBeCalledTimes(0);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
