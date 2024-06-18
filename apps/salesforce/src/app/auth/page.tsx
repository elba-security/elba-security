'use client';

import { useEffect } from 'react';
import { FullScreenSpinner } from '@elba-security/design-system';
import { create } from './actions';

export default function Setup() {
  useEffect(() => {
    async function initiateSetup() {
      const hashString = window.location.hash.substring(1);

      if (hashString ) {
        await create({ hashString });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we don't want effect retrigger & don't expect searchParams to changes
    initiateSetup();
  }, []);

  return (
    <FullScreenSpinner>
      <p>Waiting for response...</p>
    </FullScreenSpinner>
  );
}