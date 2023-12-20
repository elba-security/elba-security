import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { formatMicrosoftConsentUrl } from '@/repositories/microsoft/graph-api';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true');
  }

  cookies().set('organizationId', organizationId);
  redirect(formatMicrosoftConsentUrl());
}
