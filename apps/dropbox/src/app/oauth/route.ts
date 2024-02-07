import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from './service';
import { redirectOnError, redirectOnSuccess } from '@/common/utils';
import { logger } from '@elba-security/logger';
import { DropboxResponseError } from 'dropbox';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const cookieState = request.cookies.get('state')?.value;
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  try {
    if (error === 'access_denied') {
      return NextResponse.redirect(redirectOnError('unauthorized'));
    }

    if (typeof code !== 'string' || state !== cookieState || !organisationId || !region) {
      return NextResponse.redirect(redirectOnError('internal_error'));
    }

    await generateAccessToken({ code, organisationId, region });
  } catch (error) {
    logger.warn('Could not setup organisation after Dropbox redirection', {
      error,
    });

    if (error instanceof DropboxResponseError) {
      const { status } = error;

      if ([401, 403].includes(status)) {
        return NextResponse.redirect(redirectOnError('unauthorized'));
      }
    }

    return NextResponse.redirect(redirectOnError('internal_error'));
  }

  return NextResponse.redirect(redirectOnSuccess());
}
