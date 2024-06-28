'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';
import { DbtlabsError } from '@/connectors/common/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
  serviceToken: z.string().min(1, {
    message: 'Service Token is required',
  }),
  accountId: z.string().min(1, {
    message: 'Account ID is required',
  }),
  accessUrl: z
    .string()
    .url({ message: 'Access URL is required' })
    .transform((url) => new URL(url).origin),
});

export type FormState = {
  errors?: {
    serviceToken?: string[] | undefined;
    accountId?: string[] | undefined;
    accessUrl?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
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

    if (error instanceof DbtlabsError && error.response?.status === 401) {
      return {
        errors: {
          serviceToken: ['The given Access Token seems to be invalid'],
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
