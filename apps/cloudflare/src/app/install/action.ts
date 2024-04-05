// /app/install/actions.ts
'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/env';
import { CloudflareError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  authEmail: z.string().min(1),
  authKey: z.string().min(1),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    authEmail?: string[] | undefined;
    authKey?: string[] | undefined;
    // we are not handling region & organisationId errors in the client as fields are hidden
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const result = formSchema.safeParse({
    authEmail: formData.get('authEmail'),
    authKey: formData.get('authKey'),
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
      authEmail: result.data.authEmail,
      authKey: result.data.authKey,
    });
  } catch (error) {
    logger.warn('Could not register organisation', { error });
    if (error instanceof CloudflareError && error.response && error.response.status === 401) {
      return {
        redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=unauthorized`,
      };
    }
    return {
      redirectUrl: `${env.ELBA_REDIRECT_URL}?source_id=${env.ELBA_SOURCE_ID}&error=internal_error`,
    };
  }
};
