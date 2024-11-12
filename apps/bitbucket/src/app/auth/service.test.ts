import { expect, test, describe, vi } from 'vitest';
import * as authConnector from '@/connectors/bitbucket/auth';
import * as workspaceConnector from '@/connectors/bitbucket/workspaces';
import { getWorkspacesAndStoreToken } from './service';

const code = 'code';
const region = 'us';
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

// Mock cookies function
const mockSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => ({
    set: mockSet,
  }),
}));

describe('getWorkspacesAndStoreToken', () => {
  test('should obtain the access token & fetch workspaces', async () => {
    const getAccessToken = vi
      .spyOn(authConnector, 'getAccessToken')
      .mockResolvedValue(getTokenData);
    const getWorkspaces = vi.spyOn(workspaceConnector, 'getWorkspaces').mockResolvedValue([
      {
        uuid: workspaceId,
        name: workspaceName,
      },
    ]);

    const result = await getWorkspacesAndStoreToken({
      organisationId: organisation.id,
      code,
      region,
    });

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledWith(code);
    expect(getWorkspaces).toHaveBeenCalledTimes(1);
    expect(getWorkspaces).toHaveBeenCalledWith(accessToken);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({
      name: 'bitbucketToken',
      value: JSON.stringify({
        organisationId: organisation.id,
        accessToken,
        refreshToken,
        expiresAt: expiresIn,
        region,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
    });
    expect(result).toEqual({ workspaces: [{ uuid: workspaceId, name: workspaceName }] });
  });

  test('should throw an error if getAccessToken fails', async () => {
    vi.spyOn(authConnector, 'getAccessToken').mockRejectedValue(
      new Error('Failed to get access token')
    );

    await expect(
      getWorkspacesAndStoreToken({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrow('Failed to get access token');
  });

  test('should throw an error if getWorkspaces fails', async () => {
    vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue(getTokenData);
    vi.spyOn(workspaceConnector, 'getWorkspaces').mockRejectedValue(
      new Error('Failed to get workspaces')
    );
    await expect(
      getWorkspacesAndStoreToken({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrow('Failed to get workspaces');
  });

  test('should set secure cookie in production environment', async () => {
    const originalEnv = process.env;
    vi.stubEnv('NODE_ENV', 'production');

    vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue(getTokenData);
    vi.spyOn(workspaceConnector, 'getWorkspaces').mockResolvedValue([
      {
        uuid: workspaceId,
        name: workspaceName,
      },
    ]);
    await getWorkspacesAndStoreToken({
      organisationId: organisation.id,
      code,
      region,
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
      })
    );

    process.env = originalEnv;
  });
});
