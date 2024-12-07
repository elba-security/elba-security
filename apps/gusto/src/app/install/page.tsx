'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@elba-security/design-system';
import { nangoFrontend } from '@/common/nango/frontend';
import { setupOrganisation } from './actions';

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

  const onAuthenticate = async () => {
    await nangoFrontend.authenticate(organisationId);
    await setupOrganisation({ organisationId, region });
  };

  return (
    <div>
      <h1>Setup Gusto integration</h1>
      <Button type="button" onClick={() => void onAuthenticate()}>
        Connect with Gusto
      </Button>
    </div>
  );
}
