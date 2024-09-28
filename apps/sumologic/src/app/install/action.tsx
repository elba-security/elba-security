'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { SumologicError } from '@/connectors/commons/error';
import { env } from '@/env';
import { registerOrganisation } from './service';
import { sourceRegions } from './consts';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  accessId: z.string().min(1),
  accessKey: z.string().min(1),
  sourceRegion: z.enum(sourceRegions),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    accessId?: string[] | undefined;
    accessKey?: string[] | undefined;
    sourceRegion?: string[] | undefined;
    // we are not handling organisationId and region errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    accessId: formData.get('accessId'),
    accessKey: formData.get('accessKey'),
    sourceRegion: formData.get('sourceRegion'),
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
    await registerOrganisation(result.data);
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&success=true`,
    };
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof SumologicError && error.response?.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
