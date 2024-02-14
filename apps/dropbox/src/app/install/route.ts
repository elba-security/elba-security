import { redirectOnError } from '@/common/utils';
import { DBXAuth } from '@/connectors';
import { logger } from '@elba-security/logger';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  try {
    if (!organisationId || !region) {
      return redirectOnError(region, 'internal_error');
    }

    cookies().set('state', organisationId);
    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);
    const dbxAuth = new DBXAuth();
    const authUrl = await dbxAuth.getAuthUrl({ state: organisationId });

    if (!authUrl) {
      return redirectOnError(region, 'internal_error');
    }

    return NextResponse.redirect(String(authUrl));
  } catch (error) {
    logger.warn('Could not redirect user to Dropbox app install url', {
      error,
    });
    return redirectOnError(region, 'internal_error');
  }
}
