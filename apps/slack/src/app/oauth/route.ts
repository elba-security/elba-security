import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { handleSlackInstallation } from './service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const cookieState = request.cookies.get('state')?.value;
  const organisationId = request.cookies.get('organisationId')?.value;
  const region = request.cookies.get('region')?.value;

  // TODO: Check search params
  // error=access_denied&state=&error_description=The+user+has+denied+access+to+the+scope%28s%29+requested+by+the+client+application.
  if (
    !state ||
    state !== cookieState ||
    typeof code !== 'string' ||
    typeof organisationId !== 'string' ||
    typeof region !== 'string'
  ) {
    // TODO - replace url by elba install error
    redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`, RedirectType.replace);
  }

  // TODO: unauthorized error

  try {
    await handleSlackInstallation({ organisationId, region, code });
  } catch (error) {
    logger.error('An error occurred while handling slack installation', {
      organisationId,
      region,
      error,
    });
    redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`, RedirectType.replace);
  }

  redirect(
    `${env.ELBA_REDIRECT_URL}?success=true&source_id=${env.ELBA_SOURCE_ID}`,
    RedirectType.replace
  );
};
