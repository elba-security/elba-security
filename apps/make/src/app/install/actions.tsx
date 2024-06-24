'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { MakeError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { env } from '@/common/env';

const formSchema = z.object({
  token: z.string().min(1, { message: 'The api token is required' }).trim(),
  zoneDomain: z.string().min(1, { message: 'The zone domain is required' }).trim(),
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    token?: string[] | undefined;
    zoneDomain?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const region = formData.get('region');
  try {
    const validatedFields = formSchema.safeParse({
      token: formData.get(''),
      zoneDomain: formData.get('zoneDomain'),
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

    if (error instanceof MakeError && error.response?.status === 401) {
      return {
        errors: {
          token: ['The given API Token seems to be invalid'],
          zoneDomain: ['The given Zone Domain seems to be invalid'],
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
