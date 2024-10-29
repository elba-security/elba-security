import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { cookies } from 'next/headers';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import * as usersConnector from '@/connectors/azuredevops/users';
import { setupOrganisation } from './service';

type PartialMockCookies = Pick<ReadonlyRequestCookies, 'get'>;

const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const workspaceId = 'workspace-id';
const expiresIn = '60';
const authUserEmail = 'test@gmail.com';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  workspaceId,
  authUserEmail,
  region: 'us',
};

const mockCookieValue = JSON.stringify({
  organisationId: organisation.id,
  accessToken,
  refreshToken,
  expiresAt: expiresIn,
  region,
});

const checkWorkspaceSettingData = {
  isInvalidSecuritySetting: false,
};

const getAuthUserData = {
  authUserEmail,
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('setupOrganisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  test('should successfully setup the organisation', async () => {
    // @ts-expect-error --  @typescript-eslint/ban-ts-comment
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    vi.spyOn(usersConnector, 'checkWorkspaceSetting').mockResolvedValue(checkWorkspaceSettingData);
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(getAuthUserData);

    const mockCookies: PartialMockCookies = {
      get: vi.fn().mockReturnValue({ value: mockCookieValue }),
    };
    vi.mocked(cookies).mockReturnValue(mockCookies as ReadonlyRequestCookies);

    await db.insert(organisationsTable).values(organisation);

    await setupOrganisation({ workspaceId });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'azuredevops/users.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          isFirstSync: true,
          page: null,
        },
      },
      {
        name: 'azuredevops/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
      {
        name: 'azuredevops/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + 60 * 1000,
        },
      },
    ]);
  });

  test('should throw an error if no auth cookie is found', async () => {
    const mockCookiesWithoutAuth: PartialMockCookies = {
      get: vi.fn().mockReturnValue(undefined),
    };

    vi.mocked(cookies).mockReturnValue(mockCookiesWithoutAuth as ReadonlyRequestCookies);

    await expect(setupOrganisation({ workspaceId })).rejects.toThrow('No auth cookie found');
  });
});
