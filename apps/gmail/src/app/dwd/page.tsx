'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Alert, Button } from '@elba-security/design-system';
import { env } from '@/common/env/client';
import { GOOGLE_DWD_BASE_URL, GOOGLE_SCOPES } from '@/connectors/google/constants';
import { useInterval } from './hooks';
import { isDWDActivationPending } from './actions';
import googleConsole from './google-console.png';

const getGoogleDWDUrl = () => {
  const searchParams = new URLSearchParams({
    clientScopeToAdd: GOOGLE_SCOPES.join(','),
    clientIdToAdd: env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_ID,
    overwriteClientId: 'true',
  });

  return `${GOOGLE_DWD_BASE_URL}?${searchParams.toString()}`;
};

export default function DWD() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'activated'>('idle');
  const url = getGoogleDWDUrl();

  const checkDWDActivationStatus = async () => {
    const isActivationPending = await isDWDActivationPending();
    // when being redirected, isActivationPending will be undefined
    if (!isActivationPending) {
      setStatus('activated');
    }
  };

  useInterval(checkDWDActivationStatus, status === 'loading' ? 5000 : null);

  return (
    <>
      <h1>Enable Domain Wide Delegation</h1>
      <p>To function properly, elba needs you to allow domain-wide delegation.</p>
      <p>
        All you have to do is <strong>click on the following button</strong>, which will open a tab
        in Google Admin, and then click on <strong>Authorize</strong> as shown below. Return to this
        page when it&apos;s done.
      </p>
      <div className="mt-4 flex flex-col space-y-6 items-center">
        <Image alt="edit domain wide delegation scopes" src={googleConsole} />
        {status !== 'activated' && (
          <a href={url} rel="noreferrer" target="_blank">
            <Button
              onClick={() => {
                setStatus('loading');
              }}
              type="button">
              Open Google Admin
            </Button>
          </a>
        )}
        {status !== 'idle' && (
          <Alert status={status === 'activated' ? 'success' : 'warning'}>
            {status === 'activated'
              ? 'Success. Redirecting to elba...'
              : 'Please go back to the Google Admin panel to authorize the client ID!'}
          </Alert>
        )}
      </div>
    </>
  );
}
