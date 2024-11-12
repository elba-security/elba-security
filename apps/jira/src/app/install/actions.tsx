'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { JiraError } from '@/connectors/common/error';
import { env } from '@/common/env';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiToken: z.string().min(1, { message: 'The api token is required' }).trim(),
  domain: z.string().min(1, { message: 'The domain is required' }).trim(),
  email: z.string().email().min(1, { message: 'The email is required' }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiToken?: string[] | undefined;
    domain?: string[] | undefined;
    email?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiToken: formData.get('apiToken'),
      domain: formData.get('domain'),
      email: formData.get('email'),
      organisationId: formData.get('organisationId'),
      region: formData.get('region'),
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

    if (error instanceof JiraError) {
      const status = error.response?.status;
      // 403: Site temporarily unavailable
      // 503: Your Jira Cloud subscription has been deactivated due to inactivity
      if (status && [404, 503].includes(status) && error.response) {
        const errorText = await error.response.clone().text();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we trust the response.text on error
        const errorResult: {
          errorMessage: string;
          errorCode: string;
        } = JSON.parse(errorText);

        return {
          errors: {
            domain: [`${errorResult.errorMessage}, please check your domain`],
          },
        };
      }

      if (status === 401) {
        return {
          errors: {
            apiToken: ['The given API token seems to be invalid'],
            email: ['The given API email seems to be invalid'],
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
