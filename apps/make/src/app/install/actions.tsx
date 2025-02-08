'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { MakeError } from '@/connectors/common/error';
import { env } from '@/common/env';
import { registerOrganisation, getSaasOrganizations } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  apiToken: z.string().min(1, { message: 'API token is required' }),
  zoneDomain: z.string().min(1, { message: 'Zone Domain is required' }),
  selectedOrganizationId: z
    .string()
    .min(1, { message: 'Please select your organization' })
    .nullable(),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    apiToken?: string[] | undefined;
    zoneDomain?: string[] | undefined;
    selectedOrganizationId?: string[] | undefined;
  };
  selectedOrganizationId?: string | null;
  organizations?: {
    id: number;
    name: string;
    zone: string;
  }[];
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const result = formSchema.safeParse({
      apiToken: formData.get('apiToken'),
      zoneDomain: formData.get('zoneDomain'),
      organisationId: formData.get('organisationId'),
      selectedOrganizationId: formData.get('selectedOrganizationId'),
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

    const { organisationId, zoneDomain, apiToken, selectedOrganizationId } = result.data;
    if (!selectedOrganizationId) {
      return await getSaasOrganizations({
        apiToken: result.data.apiToken,
        zoneDomain: result.data.zoneDomain,
      });
    }

    await registerOrganisation({
      organisationId,
      region: region as string,
      zoneDomain,
      apiToken,
      selectedOrganizationId,
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
    if (error instanceof MakeError && error.response?.status === 401) {
      return {
        errors: {
          apiToken: ['The given API token seems to be invalid'],
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
