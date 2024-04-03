import type { NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { DropboxResponseError } from 'dropbox';
import { redirectOnError, redirectOnSuccess } from '@/common/utils';
import { generateAccessToken } from './service';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const authError = searchParams.get('error');
  const cookieState = request.cookies.get('state')?.value;
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  try {
    if (authError === 'access_denied') {
      return redirectOnError(region, 'unauthorized');
    }

    if (typeof code !== 'string' || state !== cookieState || !organisationId || !region) {
      return redirectOnError(region, 'internal_error');
    }

    await generateAccessToken({ code, organisationId, region });
  } catch (error) {
    logger.warn('Could not setup organisation after Dropbox redirection', {
      error,
    });

    if (error instanceof DropboxResponseError) {
      const { status } = error;

      if ([401, 403].includes(status)) {
        return redirectOnError(region, 'unauthorized');
      }
    }

    return redirectOnError(region, 'internal_error');
  }

  return redirectOnSuccess(region);
}
