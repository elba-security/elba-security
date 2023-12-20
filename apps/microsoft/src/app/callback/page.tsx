import { cookies } from 'next/headers';
import { handleMicrosoftAuthCallback } from '@/repositories/microsoft/auth';

type CallbackPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const isAdminConsentGiven = searchParams?.admin_consent === 'True';
  const tenantId = searchParams?.tenant as string;
  const organizationId = cookies().get('organizationId')?.value;

  try {
    const result = await handleMicrosoftAuthCallback({
      isAdminConsentGiven,
      tenantId,
      elbaOrganizationId: organizationId,
    });
    // TODO - replace url by elba install success
    return result;
  } catch (error) {
    throw new Error('Something wrong happened', { cause: error });
  }
}
