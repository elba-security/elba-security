'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { SentryError } from '@/connectors/commons/error';
import { env } from '@/env';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  token: z.string().min(1),
  sourceOrganizationId: z.string().min(1),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    token?: string[] | undefined;
    // we are not handling organisationId and region errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    token: formData.get('token'),
    sourceOrganizationId: formData.get('sourceOrganizationId'),
    organisationId: formData.get('organisationId'),
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
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof SentryError && error.response?.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};

