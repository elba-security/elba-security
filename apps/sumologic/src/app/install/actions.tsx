'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { SumologicError } from '@/connectors/common/error';
import { env } from '@/common/env';
import { SUMOLOGIC_REGIONS_NAMES } from '@/connectors/sumologic/regions';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  accessId: z.string().min(1, { message: 'The access id is required' }).trim(),
  accessKey: z.string().min(1, { message: 'The access key is required' }).trim(),
  sourceRegion: z.enum(SUMOLOGIC_REGIONS_NAMES, {
    errorMap: () => ({ message: 'The region is required' }),
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    accessId?: string[] | undefined;
    accessKey?: string[] | undefined;
    sourceRegion?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const validatedFields = formSchema.safeParse({
      accessId: formData.get('accessId'),
      accessKey: formData.get('accessKey'),
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

    if (error instanceof SumologicError && error.response?.status === 401) {
      return {
        errors: {
          accessId: ['The given Access Id seems to be invalid'],
          accessKey: ['The given API Access Key seems to be invalid'],
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
