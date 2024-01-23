import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from './service';
import { env } from '@/env';
import { logger } from '@elba-security/logger';

const redirectOnError = ({
  cause,
  errorCode,
  organisationId,
}: {
  cause?: string | unknown;
  errorCode: string;
  organisationId?: string;
}) => {
  logger.error('An error occurred while installing the Dropbox', {
    errorCode,
    organisationId,
    cause,
  });

  return NextResponse.redirect(
    `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=${errorCode}`
  );
};

const redirectOnSuccess = () => {
  return NextResponse.redirect(
    `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`
  );
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const cookieState = request.cookies.get('state')?.value;
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  try {
    if (error === 'access_denied') {
      return redirectOnError({
        cause: 'User denied access to Dropbox',
        errorCode: 'unauthorized',
        organisationId,
      });
    }

    if (typeof code !== 'string') {
      return redirectOnError({
        cause: 'No code returned from Dropbox',
        errorCode: 'internal_error',
        organisationId,
      });
    }

    if (!state || state !== cookieState) {
      return redirectOnError({
        cause: 'State does not match organisation id',
        errorCode: 'internal_error',
        organisationId,
      });
    }

    if (!organisationId || !region) {
      return redirectOnError({
        cause: 'No organisationId or region found',
        errorCode: 'internal_error',
        organisationId,
      });
    }

    await generateAccessToken({ code, organisationId, region });

    return redirectOnSuccess();
  } catch (error) {
    return redirectOnError({
      cause: error,
      errorCode: 'internal_error',
      organisationId,
    });
  }
}
