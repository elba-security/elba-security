'use server';

import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- tg
import { env } from '@/common/env';
import { OpenAiError } from '@/connectors/common/error';
import { getTokenOwnerInfo } from '@/connectors/openai/users';
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
    apiKey?: string[];
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiKey: formData.get('apiKey'),
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

    const { userId, organization } = await getTokenOwnerInfo(result.data.apiKey);

    // This check is not the cleanest. Sadly the endpoint doesn't return `is_service_account`
    // user are always prefixed with `user-` but service accounts aren't
    // If an admin creates a service account with a name starting with `user-` this will fail
    // We should probably rely on email attribute as it's null for service accounts
    if (userId.startsWith('user-')) {
      return { errors: { apiKey: ["The given API key doesn't belong to a service account"] } };
    }
    if (organization?.personal) {
      return { errors: { apiKey: ["Personal organizations aren't supported"] } };
    }
    if (!organization?.id) {
      return { errors: { apiKey: ["The given API key doesn't belong to an organization"] } };
    }
    if (organization.role !== 'owner') {
      return { errors: { apiKey: ["The service account role isn't 'owner'"] } };
    }

    await registerOrganisation({
      apiKey: result.data.apiKey,
      organisationId: result.data.organisationId,
      sourceOrganizationId: organization.id,
      region: result.data.region,
    });

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
      error: 'internal_error',
    }),
    RedirectType.replace
  );
};
