import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import type { NextRequest } from 'next/server';
import { RequestError } from '@octokit/request-error';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawInstallationId = request.nextUrl.searchParams.get('installation_id');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('organisation_id')?.value;
  const installationId = Number(rawInstallationId);

  if (Number.isNaN(installationId) || rawInstallationId === null || !organisationId || !region) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`, RedirectType.replace);
  }

  try {
    await setupOrganisation(installationId, organisationId, region);
    redirect(`${env.ELBA_REDIRECT_URL}?success=true`, RedirectType.replace);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof RequestError && error.response?.status === 401) {
      redirect(`${env.ELBA_REDIRECT_URL}?error=unauthorized`, RedirectType.replace);
    }
    redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`, RedirectType.replace);
  }
}
