'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { ElasticError } from '@/connectors/elastic/common/error';
import { env } from '@/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiKey: z.string().min(1, {
    message: 'API Key is required',
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiKey?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiKey: formData.get('apiKey'),
      organisationId: formData.get('organisationId'),
      region,
    });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      //  elba should had given us a valid organisationId and region, so we let elba handle this error case
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

    await registerOrganisation(result.data);

    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: result.data.region,
      }),
      RedirectType.replace
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logger.warn('Could not register organisation', { error });

    if (error instanceof ElasticError && error.response?.status === 401) {
      return {
        errors: {
          apiKey: ['The given API key seems to be invalid'],
        },
      };
    }

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
