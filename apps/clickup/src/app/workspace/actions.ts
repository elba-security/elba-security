'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const redirectTo = () => {
  const redirectUrl = cookies().get('redirect_url')?.value;
  if (!redirectUrl) {
    throw new Error('Redirect URL not found');
  }
  redirect(redirectUrl);
};
