import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupAdmin, setupOrganisation } from './service';
import axios from 'axios';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const basicCode = request.nextUrl.searchParams.get('code');
    const organisationId = request.cookies.get('organisation_id')?.value as string;

    const URL = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

    const requestBody = {
      grant_type: 'authorization_code',
      client_id: env.AZURE_AD_CLIENT_ID,
      client_secret: env.AZURE_AD_CLIENT_SECRET,
      code: basicCode,
      redirect_uri: env.AZURE_AUTH_REDIRECT_URL,
    };

    const result = await axios.post(URL, requestBody, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token } = result.data;
    if (!access_token || !refresh_token) {
      console.log('Error: Either access_token or refresh_token is missing');
      redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
    }
    await setupOrganisation(organisationId, access_token, refresh_token);
    console.log('Setting up Organization: Success!');
    await setupAdmin(organisationId);
    console.log('Setting up Admin: Success!');

    redirect(
      `${env.ELBA_REDIRECT_URL}?source=${env.ELBA_SOURCE_ID}&success=true`,
      RedirectType.replace
    );
  } catch (error: any) {
    console.log('Error: ', error);
    redirect(
      `${env.ELBA_REDIRECT_URL}?source=${env.ELBA_SOURCE_ID}&error=${
        error?.response?.status ?? 500
      }`,
      RedirectType.replace
    );
  }
}
