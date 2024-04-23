'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { env } from '@/env';
import { OpenAiError } from '@/connectors/openai/common/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiKey: z.string().min(1, {
    message: 'API Key is required',
  }),
  sourceOrganizationId: z.string().min(1, {
    message: 'Organization ID is required',
  }),
  region: z.string().min(1),
});

export type FormState = {
  redirectUrl?: string;
  errors?: {
    apiKey?: string[];
    sourceOrganizationId?: string[];
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const region = formData.get('region');
  try {
    const result = formSchema.parse({
      apiKey: formData.get('apiKey'),
      sourceOrganizationId: formData.get('sourceOrganizationId'),
      organisationId: formData.get('organisationId'),
      region: formData.get('region'),
    });

    await registerOrganisation(result);

    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: result.region,
      }),
      RedirectType.replace
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    logger.warn('Could not register organisation', { error });
    if (error instanceof OpenAiError && error.response?.status === 401) {
      return {
        errors: {
          apiKey: ['The given API key seems to be invalid'],
        },
      };
    }
  }
  redirect(
    getRedirectUrl({
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      region: region as string,
    }),
    RedirectType.replace
  );
};
