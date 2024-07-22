import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { cookies } from 'next/headers';
import { env } from '@/common/env';

export const preferredRegion = 'iad1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const routeInputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

const scopes = [
  'offline_access',
  'ACCESS_EMAIL_ADDRESSES',
  'read:confluence-user',
  'read:group:confluence',
  'read:user:confluence',
  'read:content-details:confluence',
  'write:content.restriction:confluence',
  'read:page:confluence',
  'read:permission:confluence',
  'write:space.permission:confluence',
  'read:space:confluence',
];

const rawRedirectUrl = new URL('https://auth.atlassian.com/authorize');
rawRedirectUrl.searchParams.set('client_id', env.CONFLUENCE_CLIENT_ID);
rawRedirectUrl.searchParams.set('redirect_uri', env.CONFLUENCE_REDIRECT_URI);
rawRedirectUrl.searchParams.set('response_type', 'code');

// atlassian url parser is odd and only accept %20 as separator
// so we have to encode the scopes in the url ourself
const redirectUrl = `${rawRedirectUrl.toString()}&scope=${encodeURIComponent(scopes.join(' '))}`;

export const GET = (request: NextRequest) => {
  try {
    const { organisationId, region } = routeInputSchema.parse({
      organisationId: request.nextUrl.searchParams.get('organisation_id'),
      region: request.nextUrl.searchParams.get('region'),
    });

    const state = crypto.randomUUID();

    const locationHeaderUrl = new URL(redirectUrl);
    locationHeaderUrl.searchParams.append('state', state);

    cookies().set('state', state);
    cookies().set('organisation_id', organisationId);
    cookies().set('region', region);

    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: locationHeaderUrl.toString(),
      },
    });
  } catch (error) {
    logger.warn('Could not redirect user to install url', {
      error,
    });
    return new ElbaInstallRedirectResponse({
      baseUrl: env.ELBA_REDIRECT_URL.toString(),
      sourceId: env.ELBA_SOURCE_ID.toString(),
      region: request.nextUrl.searchParams.get('region'),
      error: 'internal_error',
    });
  }
};
