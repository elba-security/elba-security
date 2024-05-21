'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { env } from '@/common/env/client';
import { GOOGLE_DWD_BASE_URL, GOOGLE_SCOPES } from '@/connectors/google/constants';
import { useInterval } from './hooks';
import { isDWDActivationPending } from './actions';
import googleConsole from './google-console.png';
import style from './dwd.module.css';

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
    <div className={style.dwd}>
      <h1 className={style.title}>Enable Domain Wide Delegation</h1>
      <p className={style.description}>
        To function properly, elba needs you to allow domain-wide delegation.
      </p>
      <p className={style.description}>
        All you have to do is <strong>click on the following button</strong>, which will open a tab
        in Google Admin, and then click on <strong>Authorize</strong> as shown below. Return to this
        page when it&apos;s done.
      </p>
      <div className={style.center}>
        <Image alt="edit domain wide delegation scopes" src={googleConsole} />
        {status !== 'activated' && (
          <a href={url} rel="noreferrer" target="_blank">
            <button
              className={style.button}
              onClick={() => {
                setStatus('loading');
              }}
              type="button">
              Open Google Admin
            </button>
          </a>
        )}
        {status !== 'idle' && (
          <div className={`${style.status} ${style[status]}`}>
            <p>
              {status === 'activated'
                ? 'Success. Redirecting to elba...'
                : 'Please go back to the Google Admin panel to authorize the client ID!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
