'use server';
import { cookies } from 'next/headers';
import { registerInstallation } from '../../services/registerInstallation.service';

type SetupPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const rawInstallationId = searchParams?.['installation_id'];
  const installationId = Number(rawInstallationId);

  if (Number.isNaN(installationId) || !rawInstallationId) {
    throw new Error('foo bar');
  }

  const organisationId = cookies().get('organisationId')?.value;
  if (typeof organisationId !== 'string') {
    throw new Error('blabla');
  }

  try {
    await registerInstallation(installationId, organisationId);
    return <span>Elba github app installed !</span>;
  } catch (error) {
    return <span>Could not install github app</span>;
  }
}
