'use server';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { RedirectType, redirect } from 'next/navigation';
import { z } from 'zod';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';
import { FivetranError } from '@/connectors/common/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiKey: z.string().min(1, {
    message: 'API Key is required',
  }),
  apiSecret: z.string().min(1, {
    message: 'API Secret is required',
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiKey?: string[] | undefined;
    apiSecret?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiKey: formData.get('apiKey'),
      apiSecret: formData.get('apiSecret'),
      organisationId: formData.get('organisationId'),
      region,
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

    if (error instanceof FivetranError && error.response?.status === 401) {
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
