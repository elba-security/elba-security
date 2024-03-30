'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { Auth0Error } from '@/connectors/commons/error';
import { env } from '@/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  domain: z.string().min(1),
  audience: z.string().min(1),
  sourceOrganizationId: z.string().min(1),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    clientId?: string[] | undefined;
    clientSecret?: string[] | undefined;
    domain?: string[] | undefined;
    audience?: string[] | undefined;
    sourceOrganisationId?: string[] | undefined;
    // we are not handling organisationId and region errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    organisationId: formData.get('organisationId'),
    clientId: formData.get('clientId'),
    clientSecret: formData.get('clientSecret'),
    domain: formData.get('domain'),
    audience: formData.get('audience'),
    sourceOrganizationId: formData.get('sourceOrganizationId'),
    region: formData.get('region'),
  });

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();
    if (fieldErrors.organisationId || fieldErrors.region) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
      };
    }

    return {
      errors: fieldErrors,
    };
  }

  try {
    await registerOrganisation(result.data);

    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof Auth0Error && error.response?.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
