// /app/install/actions.ts
'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/env';
import { DatadogError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  apiKey: z.string().min(1),
  appKey: z.string().min(1),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    apiKey?: string[] | undefined;
    appKey?: string[] | undefined;
    // we are not handling region & organisationId errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    apiKey: formData.get('apiKey'),
    appKey: formData.get('appKey'),
    organisationId: formData.get('organisationId'),
    region: formData.get('region'),
  });

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();
    //  elba should had given us a valid organisationId and region, so we let elba handle this error case
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
    return registerOrganisation({
      organisationId: result.data.organisationId,
      region: result.data.region,
      apiKey: result.data.apiKey,
      appKey: result.data.appKey,
    });
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof DatadogError && error.response && error.response.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
