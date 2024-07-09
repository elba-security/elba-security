'use server';
import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { RedirectType, redirect } from 'next/navigation';
import { getRedirectUrl } from '@elba-security/sdk';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';
import { TableauError } from '@/connectors/commons/error';
import { registerOrganisation } from './service';

const formSchema = z.object({
  organisationId: z.string().uuid(),
  clientId: z.string().min(1, { message: 'The client id is required' }).trim(),
  secretId: z.string().min(1, { message: 'The secret id is required' }).trim(),
  secret: z.string().min(1, { message: 'The secret is required' }).trim(),
  email: z.string().min(1, { message: 'The admin email is required' }).trim(),
  url: z
    .string()
    .min(1, { message: 'The url is required' })
    .refine((url) => {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && /^#\/site\/[^/]+/.test(parsedUrl.hash);
    })
    .transform((url, ctx) => {
      const parsedUrl = new URL(url);
      const expression = /#\/site\/(?<contentUrl>\w+)/;
      const matches = expression.exec(parsedUrl.hash);

      //This is adding validation that the contentUrl is present in the URL provided.
      if (!matches?.groups?.contentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'The url is invalid. Please provide a valid Tableau URL.',
        });

        return z.NEVER;
      }

      return {
        baseUrl: parsedUrl.hostname,
        contentUrl: matches.groups.contentUrl,
      };
    }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    clientId?: string[] | undefined;
    secretId?: string[] | undefined;
    secret?: string[] | undefined;
    email?: string[] | undefined;
    url?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = formData.get('region');
  try {
    const validatedFields = formSchema.safeParse({
      clientId: formData.get('clientId'),
      secretId: formData.get('secretId'),
      secret: formData.get('secret'),
      email: formData.get('email'),
      url: formData.get('url'),
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

    if (error instanceof TableauError && error.response?.status === 401) {
      return {
        errors: {
          clientId: ['The given Client ID seems to be invalid'],
          secretId: ['The given Secret ID seems to be invalid'],
          secret: ['The given Secret seems to be invalid'],
          email: ['The given Email seems to be invalid'],
          url: ['The given URL seems to be invalid'],
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
