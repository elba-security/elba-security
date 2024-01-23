import { DBXAuth } from '@/connectors';
import { env } from '@/env';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const getDropboxAuthUrl = async (organisationId: string) => {
  try {
    const dbxAuth = new DBXAuth();
    return await dbxAuth.getAuthUrl({ state: organisationId });
  } catch (error) {
    throw new Error('Unable to get Dropbox auth URL', {
      cause: error,
    });
  }
};

export async function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');
  const region = request.nextUrl.searchParams.get('region');

  if (!organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`);
  }

  cookies().set('state', organisationId);
  cookies().set('organisation_id', organisationId);
  cookies().set('region', region);

  const authUrl = await getDropboxAuthUrl(organisationId);

  if (authUrl) {
    redirect(String(authUrl));
  }

  redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`);
}
