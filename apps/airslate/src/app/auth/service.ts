import { cookies } from 'next/headers';
import { getToken } from '@/connectors/airslate/auth';
import { getWorkspaces } from '@/connectors/airslate/workspaces';

export const getWorkspacesAndStoreToken = async ({
  organisationId,
  code,
  region,
}: {
  organisationId: string;
  code: string;
  region: string;
}) => {
  const { accessToken, refreshToken, expiresIn } = await getToken(code);

  const workspaces = await getWorkspaces(accessToken);

  const tokenData = {
    organisationId,
    accessToken,
    refreshToken,
    expiresAt: expiresIn,
    region,
  };

  cookies().set({
    name: 'airslateToken',
    value: JSON.stringify(tokenData),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
  });

  if (!workspaces.length) {
    throw new Error('No workspaces found');
  }

  return {
    workspaces,
  };
};
