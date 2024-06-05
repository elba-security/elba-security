'use server';

import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { isAdminToken } from '@/connectors/monday/auth';
import { MondayError } from '@/connectors/common/error';
import { setupOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  token: z.string().min(1, {
    message: 'API token is required',
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    token?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      token: formData.get('token'),
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

    const isAdmin = await isAdminToken(result.data.token);
    if (!isAdmin) {
      return {
        errors: {
          token: ['The given API token belongs to a user that does not have admin permissions'],
        },
      };
    }

    await setupOrganisation(result.data);

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

    if (error instanceof MondayError && error.response?.status === 401) {
      return {
        errors: {
          token: ['The given API token seems to be invalid'],
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
