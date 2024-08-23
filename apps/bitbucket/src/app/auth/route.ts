import { NextResponse, type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { cookies } from 'next/headers';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const isStateValid = (request: NextRequest) => {
  const stateParam = request.nextUrl.searchParams.get('state');
  const cookieParam = request.cookies.get('state')?.value;
  if (!stateParam || !cookieParam || stateParam !== cookieParam) {
    return false;
  }
  return true;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;
  const workspaceId = request.cookies.get('workspace_id')?.value;
  cookies().delete('workspace_id');

  if (!isStateValid(request) || !code || !organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  try {
    const response = await setupOrganisation({
      organisationId,
      code,
      region,
      workspaceId,
    });

    if (response?.hasMultipleWorkspaces) {
      const encodedWorkspaces = encodeURIComponent(JSON.stringify(response.workspaces));
      return NextResponse.redirect(
        new URL(`/workspace?workspaces=${encodedWorkspaces}`, request.nextUrl.origin)
      );
    }
  } catch (error) {
    logger.error('Could not setup organisation', { error, organisationId });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
}
