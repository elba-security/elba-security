import { DBXAuth } from '@/repositories/dropbox/clients';
import { redirect } from 'next/navigation';

const getDropboxAuthUrl = async (organisationId: string) => {
  try {
    const dbxAuth = new DBXAuth();
    return await dbxAuth.getAuthUrl({ state: organisationId });
  } catch (e) {
    console.log(e);
    return null;
  }
};

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { organisation_id: organisationId } = searchParams;
  if (!organisationId) {
    return <span>Invalid redirect url</span>;
  }

  const authUrl = await getDropboxAuthUrl(organisationId as string);

  if (authUrl) {
    redirect(String(authUrl));
  }

  return <a href="https://admin.elba.ninja">connect elba to Github</a>;
}
