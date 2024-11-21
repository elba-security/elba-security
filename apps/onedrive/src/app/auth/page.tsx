'use client';

import { useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { FullScreenSpinner } from '@elba-security/design-system';
import { checkAppInstallation } from './actions';

const poolCheckAppInstallation = async (searchParams: ReadonlyURLSearchParams) => {
  const isWaiting = await checkAppInstallation({
    tenant: searchParams.get('tenant'),
    adminConsent: searchParams.get('admin_consent'),
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

  return (
    <FullScreenSpinner>
      <p>Waiting for Microsoft confirmation...</p>
    </FullScreenSpinner>
  );
}
