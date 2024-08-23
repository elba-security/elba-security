import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as authConnector from '@/connectors/bitbucket/auth';
import * as crypto from '@/common/crypto';
import { BitbucketError } from '@/connectors/common/error';
import * as workspaceConnector from '@/connectors/bitbucket/workspaces';
import { setupOrganisation } from './service';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const workspaceId = 'workspace-id';
const workspaceName = 'test-workspace-name';
const expiresIn = 60;

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  workspaceId,
  accessToken,
  refreshToken,
  region,
};

const getTokenData = {
  accessToken,
  refreshToken,
  expiresIn,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation id is valid and the organisation is not registered', async () => {
    const getAccessToken = vi
      .spyOn(authConnector, 'getAccessToken')
      .mockResolvedValue(getTokenData);
    const getWorkspaces = vi.spyOn(workspaceConnector, 'getWorkspaces').mockResolvedValue([
      {
        uuid: workspaceId,
        name: workspaceName,
      },
    ]);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);

    expect(getWorkspaces).toBeCalledTimes(1);
    expect(getWorkspaces).toBeCalledWith(accessToken);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new BitbucketError(`Organisation with ID ${organisation.id} not found.`);
    }

    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'bitbucket/users.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          isFirstSync: true,
          page: null,
        },
      },
      {
        name: 'bitbucket/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'bitbucket/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const getAccessToken = vi
      .spyOn(authConnector, 'getAccessToken')
      .mockResolvedValue(getTokenData);

    await db.insert(organisationsTable).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new BitbucketError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'bitbucket/users.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          isFirstSync: true,
          page: null,
        },
      },
      {
        name: 'bitbucket/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'bitbucket/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'wrong-id';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    await expect(
      setupOrganisation({
        organisationId: wrongId,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
