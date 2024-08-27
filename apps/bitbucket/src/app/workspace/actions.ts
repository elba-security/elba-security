'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getRedirectUrl } from '@elba-security/sdk';
import { RedirectType } from 'next/dist/client/components/redirect';
import { cookies } from 'next/headers';
import { unstable_noStore } from 'next/cache'; // eslint-disable-line camelcase -- next sucks
import { env } from '@/common/env';
import { setupOrganisation } from './service';

const formSchema = z.object({
  workspaceId: z
    .string({
      invalid_type_error: 'Please select the workspace',
    })
    .min(1, { message: 'Please select the workspace' }),
  region: z.string().min(1),
});

export type FormState = {
  errors?: {
    workspaceId?: string[] | undefined;
  };
};

export const install = async (_: FormState, formData: FormData): Promise<FormState> => {
  unstable_noStore();
  const region = cookies().get('region')?.value;

  const result = formSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    region,
  });

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();

    if (fieldErrors.region) {
      redirect(
        getRedirectUrl({
          sourceId: env.ELBA_SOURCE_ID,
          baseUrl: env.ELBA_REDIRECT_URL,
          region: region || '',
          error: 'internal_error',
        }),
        RedirectType.replace
      );
    }

    return {
      errors: fieldErrors,
    };
  }

  await setupOrganisation({
    workspaceId: result.data.workspaceId,
  });

  redirect(
    getRedirectUrl({
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      region: result.data.region,
    }),
    RedirectType.replace
  );
};
