import { NextResponse, type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { getWorkspacesAndStoreToken } from './service';

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

  if (!isStateValid(request) || !code || !organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  try {
    const response = await getWorkspacesAndStoreToken({
      organisationId,
      code,
      region,
    });

    return NextResponse.redirect(
      new URL(
        `/workspace?workspaces=${encodeURIComponent(JSON.stringify(response.workspaces))}`,
        request.nextUrl.origin
      )
    );
  } catch (error) {
    logger.error('Could not setup organisation', { error, organisationId });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }
}
