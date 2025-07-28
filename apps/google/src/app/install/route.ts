import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/common/env/server';
import { getGoogleOAuthClient } from '@/connectors/google/clients';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');
  const cookieStore = await cookies();

  if (!organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  const googleOAuthClient = getGoogleOAuthClient();
  const redirectUrl = googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
    ],
  });

  cookieStore.set('organisation_id', organisationId);
  cookieStore.set('region', region);

  redirect(redirectUrl);
};
