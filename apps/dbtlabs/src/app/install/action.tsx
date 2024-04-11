'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { DbtlabsError } from '@/connectors/commons/error';
import { env } from '@/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  serviceToken: z.string().min(1),
  accountId: z.string().min(1),
  accessUrl: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    serviceToken?: string[] | undefined;
    accountId?: string[] | undefined;
    accessUrl?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    organisationId: formData.get('organisationId'),
    region: formData.get('region'),
    serviceToken: formData.get('serviceToken'),
    accountId: formData.get('accountId'),
    accessUrl: formData.get('accessUrl'),
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
    if (error instanceof DbtlabsError && error.response?.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
