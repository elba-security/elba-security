'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { authenticate } from '@elba-security/nango';
import { setupOrganisation } from './actions';
import { GradientBackground } from './components/GradientBackground';

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

  useEffect(() => {
    const res = authenticate();

    res.on('success', async (authResult: { connectionId: string }) => {
      await setupOrganisation({ organisationId, connectionId: authResult.connectionId, region });
    });
  }, []);

  return <GradientBackground />;
}
