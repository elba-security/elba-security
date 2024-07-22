'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { DatadogError } from '@/connectors/common/error';
import { env } from '@/common/env';
import { DATADOG_REGIONS } from '@/connectors/datadog/regions';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiKey: z.string().min(1, { message: 'The api token is required' }).trim(),
  appKey: z.string().min(1, { message: 'The app key is required' }).trim(),
  sourceRegion: z.enum(DATADOG_REGIONS, {
    errorMap: () => ({ message: 'The region is required' }),
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiKey?: string[] | undefined;
    appKey?: string[] | undefined;
    sourceRegion?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const validatedFields = formSchema.safeParse({
      apiKey: formData.get('apiKey'),
      appKey: formData.get('appKey'),
      sourceRegion: formData.get('sourceRegion'),
      organisationId: formData.get('organisationId'),
      region: formData.get('region'),
    });

    if (!validatedFields.success) {
      const { fieldErrors } = validatedFields.error.flatten();
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

    await registerOrganisation(validatedFields.data);

    redirect(
      getRedirectUrl({
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        region: validatedFields.data.region,
      }),
      RedirectType.replace
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logger.warn('Could not register organisation', { error });

    if (error instanceof DatadogError && error.response?.status === 401) {
      return {
        errors: {
          apiKey: ['The given API Token seems to be invalid'],
          appKey: ['The given API App Key seems to be invalid'],
          sourceRegion: ['The given Source Region seems to be invalid'],
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
