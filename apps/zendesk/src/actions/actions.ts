'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  domain: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    domain?: string[] | undefined;
    clientId?: string[] | undefined;
    clientSecret?: string[] | undefined;
    // we are not handling region & organisationId errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    domain: formData.get('domain'),
    clientId: formData.get('clientId'),
    clientSecret: formData.get('clientSecret'),
    organisationId: formData.get('organisationId'),
    region: formData.get('region'),
  });

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();
    // elba should have given valid organisationId and region, so we let it handle this error case
    if (fieldErrors.organisationId || fieldErrors.region) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      };
    }

    return {
      errors: fieldErrors,
    };
  }
  
   cookies().set('organisation_id', result.data.organisationId);
   cookies().set('region', result.data.region);

  try {
    await registerOrganisation({
      organisationId: result.data.organisationId,
      region: result.data.region,
      domain: result.data.domain,
      clientId: result.data.clientId,
      clientSecret: result.data.clientSecret,
    });
    
    const redirectURL = env.REDIRECTION_URL_FOR_ZENDESK;
    const clientId = result.data.clientId;
    
    const scope = `read write`;
    const zendeskUrl = `${result.data.domain}/oauth/authorizations/new?response_type=code&redirect_uri=${redirectURL}&client_id=${clientId}&scope=${scope}`;

    return {
        redirectUrl: zendeskUrl,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    return new ElbaInstallRedirectResponse({
          error: `internal_error`,
          region: 'us',
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
        });
  }
};