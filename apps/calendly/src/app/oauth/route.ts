import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const preferredRegion = env.VERCEL_PREFERRED_REGION;
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;
  const cookieState = request.cookies.get('state')?.value;

  try {
    if (typeof code !== 'string' || state !== cookieState || !organisationId || !region) {
      return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?error=unauthorized`);
    }
    await setupOrganisation({ organisationId, code, region });
    return NextResponse.redirect(
      `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`
    );
  } catch (error) {
    logger.warn('Could not setup organisation after Calendly redirection', { error });
    return NextResponse.redirect(
      `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`
    );
  }
}
