'use client';

import { Button, InstructionsStep, InstructionsSteps } from '@elba-security/design-system';
import Link from 'next/link';
import { env } from '@/common/env/client';
import { connectMondayApp } from './actions';

export default function InstallPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const organisationId = searchParams.organisation_id;
  const region = searchParams.region;
  const mondayInstallUrl = `https://auth.monday.com/oauth2/authorize?client_id=${env.NEXT_PUBLIC_MONDAY_CLIENT_ID}&response_type=install`;

  return (
    <>
      <h1>Setup Monday integration</h1>
      <InstructionsSteps>
        <InstructionsStep index={1}>
          <h3>Install app</h3>
          <p>First install the monday app and come back to this page afterwards</p>
          <Link
            href={mondayInstallUrl}
            rel="noopener noreferrer"
            style={{ alignSelf: 'start' }}
            target="_blank">
            <Button>Install</Button>
          </Link>
        </InstructionsStep>
        <InstructionsStep index={2}>
          <h3>Connect Monday</h3>
          <p>After installing the app, connect to your monday account</p>
          <Button
            onClick={() => connectMondayApp({ organisationId, region })}
            style={{ alignSelf: 'start' }}>
            Connect
          </Button>
        </InstructionsStep>
      </InstructionsSteps>
    </>
  );
}
