import { env } from '@/env';
import { RedirectType, redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { setUpOrganisation } from './service';
import { z } from 'zod';

const routeInputSchema = z.object({
  organisation_id: z.string(),
  region: z.string(),
  code: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const routeInput = routeInputSchema.parse({
      organisation_id: request.cookies.get('organisation_id')?.value,
      region: request.cookies.get('region')?.value,
      code: request.nextUrl.searchParams.get('code'),
    });

    await setUpOrganisation(routeInput);
  } catch (error) {
    console.log('🚀 ~ file: route.ts:8 ~ GET ~ error:', error);
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
}
