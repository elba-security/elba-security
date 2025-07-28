import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@elba-security/logger';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env/server';
import { GoogleUserNotAdminError } from '@/connectors/google/errors';
import { getGoogleInfo } from './service';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get('code');
  const cookieStore = await cookies();
  const organisationId = cookieStore.get('organisation_id')?.value;
  const region = cookieStore.get('region')?.value;

  if (!organisationId || !code || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  try {
    const { email, customerId } = await getGoogleInfo(code);
    cookieStore.set('google_admin_email', email);
    cookieStore.set('google_customer_id', customerId);
  } catch (error) {
    logger.error('An error occurred during Google oauth flow', { organisationId, cause: error });

    return redirect(error instanceof GoogleUserNotAdminError ? '/error?error=not_admin' : '/error');
  }

  redirect('/dwd', RedirectType.replace);
};
