import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as authConnector from '@/connectors/confluence/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { ConfluenceError } from '@/connectors/confluence/common/error';
import { handleInstallation } from './service';

const code = 'some-code';
const oauthToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600,
};
const instance = {
  id: 'some-instance-id',
  url: 'http://foo.bar',
};
const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const region = 'us';
const now = new Date();

describe('handleInstallation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(oauthToken);
    const getInstance = vi.spyOn(authConnector, 'getInstance').mockResolvedValue(instance);
    const checkAdmin = vi.spyOn(authConnector, 'checkAdmin').mockResolvedValue(true);

    await expect(
      handleInstallation({
        organisationId,
        searchParams: {
          code,
        },
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getInstance).toBeCalledTimes(1);
    expect(getInstance).toBeCalledWith(oauthToken.accessToken);

    expect(checkAdmin).toBeCalledTimes(1);
    expect(checkAdmin).toBeCalledWith({
      accessToken: oauthToken.accessToken,
      instanceId: instance.id,
    });

    const [insertedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    await expect(decrypt(insertedOrganisation?.accessToken ?? '')).resolves.toBe(
      oauthToken.accessToken
    );
    await expect(decrypt(insertedOrganisation?.refreshToken ?? '')).resolves.toBe(
      oauthToken.refreshToken
    );
    // verify the organisation token is set in the database
    expect(insertedOrganisation).toMatchObject({
      region,
      instanceId: instance.id,
      instanceUrl: instance.url,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'confluence/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId,
          syncStartedAt: Date.now(),
          cursor: null,
        },
      },
      {
        name: 'confluence/token.refresh.requested',
        data: {
          organisationId,
          expiresAt: now.getTime() + oauthToken.expiresIn * 1000,
        },
      },
      {
        name: 'confluence/app.installed',
        data: {
          organisationId,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values({
      id: organisationId,
      region: 'eu',
      accessToken: 'foo',
      refreshToken: 'bar',
      instanceId: 'biz',
      instanceUrl: 'https://baz.foo',
    });
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(oauthToken);
    const getInstance = vi.spyOn(authConnector, 'getInstance').mockResolvedValue(instance);
    const checkAdmin = vi.spyOn(authConnector, 'checkAdmin').mockResolvedValue(true);

    await expect(
      handleInstallation({
        organisationId,
        searchParams: {
          code,
        },
        region,
      })
    ).resolves.toBeUndefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getInstance).toBeCalledTimes(1);
    expect(getInstance).toBeCalledWith(oauthToken.accessToken);

    expect(checkAdmin).toBeCalledTimes(1);
    expect(checkAdmin).toBeCalledWith({
      accessToken: oauthToken.accessToken,
      instanceId: instance.id,
    });

    const [insertedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    await expect(decrypt(insertedOrganisation?.accessToken ?? '')).resolves.toBe(
      oauthToken.accessToken
    );
    await expect(decrypt(insertedOrganisation?.refreshToken ?? '')).resolves.toBe(
      oauthToken.refreshToken
    );
    // verify the organisation token is set in the database
    expect(insertedOrganisation).toMatchObject({
      region,
      instanceId: instance.id,
      instanceUrl: instance.url,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'confluence/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId,
          syncStartedAt: Date.now(),
          cursor: null,
        },
      },
      {
        name: 'confluence/token.refresh.requested',
        data: {
          organisationId,
          expiresAt: now.getTime() + oauthToken.expiresIn * 1000,
        },
      },
      {
        name: 'confluence/app.installed',
        data: {
          organisationId,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    const error = new ConfluenceError('Could not retrieve token', {
      response: new Response(null, { status: 401 }),
    });
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);
    const getInstance = vi.spyOn(authConnector, 'getInstance').mockResolvedValue(instance);
    const checkAdmin = vi.spyOn(authConnector, 'checkAdmin').mockResolvedValue(true);

    await expect(
      handleInstallation({
        organisationId,
        searchParams: {
          code,
        },
        region,
      })
    ).rejects.toBe(error);

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getInstance).toBeCalledTimes(0);
    expect(checkAdmin).toBeCalledTimes(0);

    await expect(db.select().from(organisationsTable)).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });

  test('should not setup the organisation when no instance has been connected', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(oauthToken);
    const getInstance = vi.spyOn(authConnector, 'getInstance').mockResolvedValue(undefined);
    const checkAdmin = vi.spyOn(authConnector, 'checkAdmin').mockResolvedValue(false);

    await expect(
      handleInstallation({
        organisationId,
        searchParams: {
          code,
        },
        region,
      })
    ).rejects.toBeDefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getInstance).toBeCalledTimes(1);
    expect(getInstance).toBeCalledWith(oauthToken.accessToken);

    expect(checkAdmin).toBeCalledTimes(0);

    await expect(db.select().from(organisationsTable)).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });

  test('should not setup the organisation when the user is not an admin', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(oauthToken);
    const getInstance = vi.spyOn(authConnector, 'getInstance').mockResolvedValue(instance);
    const checkAdmin = vi.spyOn(authConnector, 'checkAdmin').mockResolvedValue(false);

    await expect(
      handleInstallation({
        organisationId,
        searchParams: {
          code,
        },
        region,
      })
    ).rejects.toBeDefined();

    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(getInstance).toBeCalledTimes(1);
    expect(getInstance).toBeCalledWith(oauthToken.accessToken);

    expect(checkAdmin).toBeCalledTimes(1);
    expect(checkAdmin).toBeCalledWith({
      accessToken: oauthToken.accessToken,
      instanceId: instance.id,
    });

    await expect(db.select().from(organisationsTable)).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
