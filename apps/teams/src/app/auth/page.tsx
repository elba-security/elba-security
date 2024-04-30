'use client';

import { useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { checkAppInstallation } from './actions';

const poolCheckAppInstallation = async (searchParams: ReadonlyURLSearchParams) => {
  const isWaiting = await checkAppInstallation({
    tenant: searchParams.get('tenant'),
    admin_consent: searchParams.get('admin_consent'),
  });

  if (!isWaiting) {
    return;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  await poolCheckAppInstallation(searchParams);
};

export default function Auth() {
  const searchParams = useSearchParams();
  useEffect(() => {
    void poolCheckAppInstallation(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we don't want effect retrigger & don't expect searchParams to changes
  }, []);

  return <span>Waiting for Microsoft confirmation...</span>;
}
