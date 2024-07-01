'use server';
import { cookies } from 'next/headers';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  subDomain: z.string().min(1, {
    message: 'SubDomain is required',
  }),
});

export type FormState = {
  errors?: {
    subDomain?: string[] | undefined;
  };
};

export const install = (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');

  try {
    const result = formSchema.safeParse({
      organisationId: formData.get('organisationId'),
      region: formData.get('region'),
      subDomain: formData.get('subDomain'),
    });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      if (fieldErrors.organisationId || fieldErrors.region) {
        redirect(
          getRedirectUrl({
            sourceId: env.ELBA_SOURCE_ID,
            baseUrl: env.ELBA_REDIRECT_URL,
            region: region as string,
            error: 'internal_error',
          }),
          RedirectType.replace
        );
      }

      return {
        errors: fieldErrors,
      };
    }
    const state = crypto.randomUUID();

    const subDomain = result.data.subDomain;
    cookies().set('organisation_id', result.data.organisationId);
    cookies().set('region', result.data.region);
    cookies().set('state', state);
    cookies().set('subdomain', subDomain);

    const redirectUrl = new URL(`${subDomain}/oauth/authorizations/new`);
    redirectUrl.searchParams.append('response_type', 'code');
    redirectUrl.searchParams.append('client_id', env.ZENDESK_CLIENT_ID);
    redirectUrl.searchParams.append('redirect_uri', env.ZENDESK_REDIRECT_URI);
    redirectUrl.searchParams.append('state', state);
    redirectUrl.searchParams.append('scope', 'users:read users:write tickets:read');

    redirect(redirectUrl.toString());
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logger.warn('Could not register organisation', { error });

    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: region as string,
        error: 'internal_error',
      }),
      RedirectType.replace
    );
  }
};
