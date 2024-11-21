'use server';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { RedirectType, redirect } from 'next/navigation';
import { z } from 'zod';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';
import { FifteenFiveError } from '@/connectors/common/error';
import { checkUserWithEmail } from '@/connectors/fifteenfive/users';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiKey: z.string().min(1, {
    message: 'API Key is required',
  }),
  authUserEmail: z.string().email({
    message: 'Email is required',
  }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiKey?: string[] | undefined;
    authUserEmail?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiKey: formData.get('apiKey'),
      authUserEmail: formData.get('authUserEmail'),
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

    const apiKey = result.data.apiKey;
    const authUserEmail = result.data.authUserEmail;

    const { isValidEmail } = await checkUserWithEmail({ apiKey, authUserEmail });

    if (!isValidEmail) {
      return {
        errors: {
          authUserEmail: ['The email is not valid'],
        },
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

    if (error instanceof FifteenFiveError) {
      const status = error.response?.status;
      if (status && [401, 403].includes(status)) {
        return {
          errors: {
            apiKey: ['Invalid token. Please verify and try again.'],
          },
        };
      }
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
