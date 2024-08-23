'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const formSchema = z.object({
  workspaceId: z.string().min(1),
});

export type FormState = {
  errors?: {
    workspaceId?: string[] | undefined;
  };
};

export const redirectTo = (_: FormState, formData: FormData) => {
  const validatedFields = formSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
  });

  if (!validatedFields.success) {
    const { fieldErrors } = validatedFields.error.flatten();
    return {
      errors: fieldErrors,
    };
  }
  cookies().set('workspace_id', validatedFields.data.workspaceId);

  const redirectUrl = cookies().get('redirect_url')?.value;
  if (!redirectUrl) {
    throw new Error('Redirect URL not found');
  }

  const newUrl = new URL(redirectUrl);
  redirect(newUrl.toString());
};
