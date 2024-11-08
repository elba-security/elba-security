'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { authenticate } from '@elba-security/nango';
import { getSession, setupOrganisation } from './actions';
import { GradientBackground } from './components/GradientBackground';
// import Nango from '@nangohq/frontend';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');
  const region = searchParams.get('region');

  if (!organisationId) {
    throw new Error('Organisation ID is required');
  }

  if (!region) {
    throw new Error('Region is required');
  }

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const onEvent = (event) => {
    console.log({ event });
  };

  // const nango = useMemo(() => {
  //   return authenticate(undefined);
  // }, [authenticate]);
  // const connect = async () => {
  //   const session = await getSession();
  //   console.log({ session });
  //   nango.openConnectUI({
  //     sessionToken: session,
  //     onEvent: (event) => {
  //       console.log({ event });
  //     },
  //   });
  // };

  // const { open } = authenticate(onEvent);
  // setConnectionId(connectionId);

  const onAuth = async () => {
    try {
      const result = await authenticate();
      setConnectionId(result.connectionId);
    } catch (e) {
      console.error(e);
    }
  };

  // useEffect(() => {
  //   const res = authenticate();

  //   res.on('success', async (authResult: { connectionId: string }) => {
  //     await setupOrganisation({ organisationId, connectionId: authResult.connectionId, region });
  //   });
  // }, [authenticate, setupOrganisation]);

  // return <GradientBackground />;
  return connectionId ? (
    <p>Hello {connectionId}</p>
  ) : (
    <button
      type="button"
      onClick={() => {
        onAuth();
      }}>
      CONNECT
    </button>
  );
}
