import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  cookies().set('organisation_id', env.ELBA_ORGANIZATION_ID);

  let redirectUrl = `${env.AZURE_AUTH_URL}?response_type=code&scope=openid+profile+email+offline_access&client_id=${env.AZURE_AD_CLIENT_ID}&&redirect_uri=${env.AZURE_AUTH_REDIRECT_URL}`;
  redirect(redirectUrl);
}
